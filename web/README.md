# web

Frontend em Next.js, responsável pela interface do usuário, roteamento por role e consumo da API do `server`. Um dos três serviços do monorepo — veja o [README raiz](../README.md) para a visão geral do projeto.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** com tokens de tema em `globals.css` (paleta OLED pura, `#050505`)
- **shadcn/ui** (estilo `new-york`) sobre **Radix UI**
- **Framer Motion** para as animações (fade/blur/stagger centralizadas em `lib/animations/fade.ts`)
- **TanStack Query (React Query)** para cache e estado assíncrono no client
- **React Hook Form + Zod** (`@hookform/resolvers/zod`) para formulários
- **@t3-oss/env-nextjs** para validação de variáveis de ambiente em tempo de build
- **Sonner** para toasts
- **Vitest + Testing Library** para testes unitários
- **Playwright** para testes E2E

## Roteamento e controle de acesso

A aplicação usa _route groups_ do App Router para separar áreas por contexto, cada uma com seu próprio `layout.tsx`:

| Route group | Público-alvo                | Layout                                                                   |
| ----------- | --------------------------- | ------------------------------------------------------------------------ |
| `(public)`  | Visitantes não autenticados | `GridBackground`, header/footer públicos                                 |
| `(auth)`    | Login e registro            | `glass-panel` centralizado, link de volta estilo terminal (`~/sys/home`) |
| `(admin)`   | `ADMIN` e `SUPPORTER`       | Sidebar fixa (`md:pl-64`), área de trabalho com scroll independente      |
| `(sandbox)` | `USER` comum                | Layout minimalista, imersivo, sem header/footer                          |

### `proxy.ts` — o middleware de roteamento

Todo o controle de acesso por role vive em `proxy.ts`, executado antes da renderização de qualquer rota (exceto `api`, assets estáticos e favicon, conforme o `matcher`). A lógica:

1. Lê o cookie `auth_session` e faz `JSON.parse` — se falhar ou não existir, trata como usuário deslogado
2. **Deslogado** tentando acessar `(admin)` ou `(sandbox)` → redirect para `/login`. Rotas públicas seguem liberadas
3. **Logado** na raiz (`/`) → redirect automático para `/dashboard` (se `ADMIN`/`SUPPORTER`) ou `/home` (se `USER`)
4. **Logado** tentando acessar `/login` ou `/register` → redirect para o destino apropriado (evita loop de login)
5. **Logado** com role errada para a área (`USER` em `/dashboard`, ou staff em `/home`) → redirect cruzado
6. **Proteção granular para `SUPPORTER`**: mesmo tendo acesso ao `(admin)`, é bloqueado especificamente em `/dashboard/products`, `/dashboard/categories` e `/dashboard/users`, sendo redirecionado para a raiz do dashboard

Esse comportamento espelha exatamente as roles definidas no Prisma do `server` (`ADMIN`, `SUPPORTER`, `USER`), então qualquer mudança de política de acesso deve ser sincronizada nos dois lados.

## Camada de dados: services → actions → hooks

A comunicação com a API segue três camadas, cada uma com uma responsabilidade única:

```
services/         →  chamadas HTTP puras (o "o quê" da API)
  auth.service.ts
  users.service.ts

actions/           →  Server Actions: tratam erro, padronizam retorno,
  auth.actions.ts     fazem revalidatePath() e side-effects (cookies, redirect)
  users.actions.ts

hooks/             →  useQuery/useMutation (React Query), usados
  use-auth.ts          diretamente pelos componentes client
  use-users.ts
```

Toda action retorna um formato consistente:

```ts
type ActionResponse<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };
```

Os hooks nunca chamam `fetch` diretamente — sempre passam pela action correspondente, que por sua vez chama o service. Isso mantém erro de rede, revalidação de cache e navegação centralizados fora dos componentes de UI.

## `http-client.ts` — fila de refresh

O cliente HTTP (`lib/api/http-client.ts`) resolve um problema clássico de refresh token: se várias requisições tomam `401` ao mesmo tempo, cada uma tentaria renovar o token independentemente, criando uma corrida de múltiplos refreshes simultâneos (e potencialmente invalidando um refresh token que outra requisição já estava usando).

A solução implementada:

- Uma variável de módulo (`isRefreshing`) e uma `Promise` compartilhada (`refreshPromise`) garantem que **apenas a primeira requisição que recebe 401 dispara o refresh real**
- Todas as demais requisições que também recebem 401 simplesmente **esperam essa mesma Promise resolver**, depois pegam o novo Access Token da sessão e refazem sua chamada original
- Se o refresh falhar, a sessão é destruída e todas as requisições em espera rejeitam com um erro padronizado (`{ status: 401, message: "Sessão inválida." }`)

Detecção de ambiente (server vs client) também é tratada aqui: no server, o token vem via `getSession()` e é injetado no header `Authorization`; no client, o navegador já envia o cookie automaticamente via `credentials: "include"`.

## Sessão

`lib/auth/session.ts` gerencia dois cookies com propósitos distintos:

| Cookie         | Conteúdo                   | `maxAge` | Por quê                                                                                                                                          |
| -------------- | -------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth_session` | JSON com `{ token, user }` | 7 dias   | O front "lembra" quem é o usuário mesmo depois do Access Token (dentro dele) expirar em 10 minutos — o `http-client` renova o token sem deslogar |
| `refreshToken` | UUID puro                  | 7 dias   | Espelha o cookie assinado que o `server` já seta; usado para reenviar manualmente em chamadas de Server Action (ex.: `authService.logout`)       |

Ambos são `httpOnly`, com `secure` condicionado a `NODE_ENV === "production"`.

## Variáveis de ambiente

```env
NEXT_PUBLIC_API_URL=   # URL pública da API (usada pelo browser)
API_INTERNAL_URL=      # URL interna da API (usada em Server Components/Actions, ex.: nome do serviço no Docker)
```

Validadas em `lib/utils/env.ts` via `@t3-oss/env-nextjs` + Zod. Em build com `SKIP_ENV_VALIDATION=true` (usado no Dockerfile), a validação é pulada — necessário porque as URLs reais só existem em runtime/deploy, não durante o `next build`.

O `next.config.ts` faz proxy de `/api/v1/*` para `NEXT_PUBLIC_API_URL`, permitindo que o browser chame a API sob o mesmo domínio do front (evita problemas de CORS/cookie cross-site em produção).

## Rodando localmente

```bash
# a partir da raiz do monorepo
npm run dev:web

# ou, dentro da pasta web/
npm run dev
```

Servidor de desenvolvimento do Next.js em `http://localhost:3000`, consumindo a API do `server` conforme as variáveis de ambiente configuradas.

## Testes

### Unitários (Vitest + Testing Library)

```bash
npm run test        # roda uma vez
npm run test:watch  # modo watch
npm run test:ui     # UI do Vitest
```

Ambiente `jsdom`, setup em `vitest.setup.ts` (importa `@testing-library/jest-dom`). Cobrem principalmente lógica pura e sem I/O real: `cn()` (merge de classes Tailwind), `lib/auth/session.ts` (mockando `next/headers`) e `lib/api/http-client.ts` (mockando `fetch` global e a sessão, incluindo o cenário completo da fila de refresh).

### E2E (Playwright)

```bash
npm run test:e2e         # headless
npm run test:e2e:ui      # UI interativa
npm run test:e2e:report  # abre o último relatório
npm run test:e2e:codegen # gerador de testes por gravação
```

`global-setup.ts` sobe o `docker-compose.yml` da raiz (`--wait`, esperando o Postgres ficar `healthy`), aplica migrations e roda o seed antes da suíte começar; `global-teardown.ts` desliga os containers e remove os volumes (`down -v`) ao final, garantindo um ambiente limpo a cada execução. Projetos configurados para Chromium e Firefox.

## Build e produção

```bash
npm run build   # next build (output: "standalone")
npm run start   # next start
```

O `Dockerfile` usa build em três estágios (`deps` → `build` → `runner`), copiando apenas a saída `standalone` do Next.js para a imagem final `node:24-alpine`, rodando como usuário não-root (`nextjs`). Como o projeto é um monorepo, o Next.js replica a estrutura de pastas dentro do `standalone` — por isso o `Dockerfile` copia especificamente `web/.next/standalone`, `web/.next/static` e `web/public` para os caminhos corretos, e o comando final aponta para `web/server.js`.

## Scripts úteis

| Script               | O que faz                                             |
| -------------------- | ----------------------------------------------------- |
| `npm run lint`       | ESLint (config `eslint-config-next`)                  |
| `npm run type-check` | `tsc --noEmit`                                        |
| `npm run precommit`  | `lint-staged` (ESLint + Prettier nos arquivos staged) |
