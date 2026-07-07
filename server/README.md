# server

API REST em Node.js com Fastify, responsável por autenticação, gestão de usuários e persistência dos dados via Prisma/PostgreSQL. Um dos três serviços do monorepo — veja o [README raiz](../README.md) para a visão geral do projeto.

## Stack

- **Fastify 5** com [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod) — os schemas Zod validam o request e geram a documentação OpenAPI automaticamente
- **Prisma 7** com [`@prisma/adapter-pg`](https://www.npmjs.com/package/@prisma/adapter-pg) sobre `pg` (Pool nativo, sem driver adapter binário)
- **PostgreSQL**
- **bcryptjs** para hash de senha
- **@fastify/jwt** para o access token
- **@fastify/cookie** para o refresh token (cookie assinado)
- **@fastify/helmet**, **@fastify/rate-limit**, **@fastify/cors** como camada de segurança de infraestrutura
- **@scalar/fastify-api-reference** servindo a documentação interativa em `/docs`
- **Vitest** + **Supertest** para testes de integração (contra banco real)
- **ESLint + Prettier** para lint/formatação

## Arquitetura de autenticação

O sistema usa um par de tokens com responsabilidades diferentes:

| Token | Formato | Duração | Onde vive | Propósito |
|---|---|---|---|---|
| **Access Token** | JWT | 10 minutos | `Authorization: Bearer` | Autoriza requisições às rotas protegidas |
| **Refresh Token** | UUID | 7 dias | Cookie `refreshToken` (assinado, `httpOnly`, `sameSite=strict`) | Gera um novo Access Token quando o atual expira |

O Refresh Token **não é um JWT** — é um UUID persistido na tabela `tokens`, o que permite revogação real (basta deletar a linha) e rotação a cada uso.

### Fluxo de login

1. `POST /api/v1/sessions` valida a senha com `bcryptjs.compare`
2. Gera um Refresh Token (UUID) e salva no banco com `expiresAt` de 7 dias
3. Assina um Access Token (JWT) com `sub` = id do usuário e `role` no payload, expirando em 10 minutos
4. Retorna o Access Token no corpo da resposta e seta o Refresh Token como cookie assinado

### Fluxo de renovação (rotação atômica)

`PATCH /api/v1/token/refresh` lê o cookie, valida a assinatura e busca o token no banco. Se válido e não expirado, executa uma transação Prisma que **deleta o token antigo e cria um novo** (`refreshUserToken` em `resources/tokens/refresh.service.ts`), evitando que o mesmo Refresh Token seja reutilizado depois de já ter sido consumido. Um novo Access Token é emitido junto.

### Fluxo de logout

`POST /api/v1/sessions/logout` desassina o cookie, remove o token correspondente do banco (via `deleteMany`, que não lança erro se o token já não existir — logout é idempotente) e limpa o cookie no navegador.

## Autorização por role

Três roles no enum `Role` do Prisma: `ADMIN`, `SUPPORTER`, `USER`. O middleware `verifyUserRole(...allowedRoles)` bloqueia rotas administrativas para quem não tem a role exigida, retornando `403 Forbidden`.

## Rotas

Prefixo global: `/api/v1`

### Sessões (`sessions.router.ts`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/sessions` | Login — retorna Access Token + seta cookie de refresh |
| `POST` | `/sessions/logout` | Logout — invalida o refresh token e limpa o cookie |

### Refresh (`refresh.router.ts`)

| Método | Rota | Descrição |
|---|---|---|
| `PATCH` | `/token/refresh` | Rotaciona o refresh token e emite novo access token |

### Usuários (`users.router.ts`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/users` | — | Cadastro de novo usuário |
| `GET` | `/users/me` | JWT | Perfil do usuário logado |
| `PATCH` | `/users/me` | JWT | Atualiza nome/email do próprio perfil |
| `POST` | `/users/me/password` | JWT | Troca a própria senha (exige senha antiga) |
| `DELETE` | `/users/me` | JWT | Remove a própria conta |
| `GET` | `/users` | JWT + `ADMIN` | Lista todos os usuários |
| `PATCH` | `/users/:id/role` | JWT + `ADMIN` | Altera a role de um usuário |
| `DELETE` | `/users/:id` | JWT + `ADMIN` | Remove qualquer usuário |

Documentação interativa (Scalar) disponível em `/docs` quando o servidor está no ar.

## Modelo de dados

```prisma
model User {
  id            String   @id @default(uuid())
  name          String
  email         String   @unique
  password_hash String
  role          Role     @default(USER)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tokens        Token[]
}

model Token {
  id        String    @id @default(uuid())
  type      TokenType
  createdAt DateTime  @default(now())
  expiresAt DateTime?
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

`Token.type` hoje só tem o valor `REFRESH_TOKEN`, mas o enum já está preparado para outros tipos (ex.: reset de senha) sem precisar de migration adicional na estrutura da tabela.

Deletar um `User` remove seus `Token`s em cascata (`onDelete: Cascade`).

## Tratamento de erros

Handler centralizado em `lib/error-handler.ts`, que mapeia:

- Erros de validação do Fastify/Zod → `400` com o detalhe de qual campo falhou
- `AppError` (erro de regra de negócio lançado pelos services) → o `statusCode` definido na própria exceção
- `Prisma.PrismaClientKnownRequestError` `P2002` (unique constraint) → `409 Conflict`
- `Prisma.PrismaClientKnownRequestError` `P2025` (registro não encontrado) → `404 Not Found`
- Erros de JWT ausente/expirado → `401 Unauthorized`
- Qualquer outro erro não mapeado → `500`, com stack trace no console em dev e log estruturado (sem stack) em produção

## Rodando localmente

Pré-requisitos: Node 24, PostgreSQL acessível (local ou via `docker-compose.dev.yml` na raiz).

```bash
# a partir da raiz do monorepo
npm run dev:server

# ou, dentro da pasta server/
npm run dev
```

O script `dev` roda `db:gen` → `db:migrate` → `db:seed` → `tsx watch` com hot reload, formatado pelo `pino-pretty`.

### Variáveis de ambiente

Copie `.env.example` para `.env`:

```env
NODE_ENV=development
PORT=3333
JWT_SECRET=
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

Validadas em `validateEnv/index.ts` com Zod — o servidor não sobe se algo estiver faltando ou malformado.

### Seed

`prisma/seed.ts` cria um usuário de cada role (Admin, Supporter, dois Users) com senha padrão, além de tokens de refresh com diferentes cenários de expiração (válido, expirando em 1h, já expirado) — útil para testar o fluxo de renovação manualmente.

## Testes

```bash
npm run test        # roda uma vez (reseta o banco de teste antes)
npm run test:watch  # modo watch
```

Testes de integração reais (Vitest + Supertest), cobrindo:

- `sessions.controller.spec.ts` / `sessions.service.spec.ts` — login, logout, cookies assinados
- `refresh.controller.spec.ts` / `refresh.service.spec.ts` — rotação de token, cenários de expiração, cookie `Secure` em produção
- `users.controller.spec.ts` / `users.service.spec.ts` — CRUD, permissões por role, hashing de senha

Banco de teste isolado via `.env.test`, resetado a cada execução (`prisma migrate reset --force`).

## Build e produção

```bash
npm run build   # gera o Prisma Client e compila TypeScript para dist/
npm run start   # aplica migrations, roda o seed de produção e inicia via node
```

Em produção, o processo escuta em `0.0.0.0` (compatível com container Docker) e trata `SIGINT`/`SIGTERM` para desligamento gracioso (`app.close()` antes de `process.exit`).

O `Dockerfile` usa build em dois estágios: builder completo com todas as dependências, depois uma imagem final `node:24-alpine` minimalista, rodando como usuário não-root (`fastifyuser`), contendo apenas o `dist/` compilado e as dependências de produção.

## Scripts úteis

| Script | O que faz |
|---|---|
| `npm run db:studio` | Abre o Prisma Studio (GUI do banco) |
| `npm run db:format` | Formata o `schema.prisma` |
| `npm run lint:fix` | Corrige problemas de lint automaticamente |
| `npm run type-check` | Roda `tsc --noEmit` |