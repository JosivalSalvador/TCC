# TCC — Plataforma de Análise de Vídeos Curtos

Plataforma full-stack que analisa vídeos curtos (YouTube Shorts) por nicho e gera recomendações estruturadas de conteúdo para criadores, combinando pipeline de PLN, clusterização e geração assistida por LLM.

Este repositório foi desenvolvido como Trabalho de Conclusão de Curso (Ciência da Computação, IComp/UFAM), mas a arquitetura e o código foram construídos com padrões de produção — sirva de referência tanto para avaliação acadêmica quanto como projeto de portfólio.

## Arquitetura

O sistema é um monorepo com três serviços independentes, orquestrados via Docker Compose e Turborepo:

```
tcc/
├── web/     → Next.js 16 — frontend
├── server/  → Fastify + Prisma — API REST
└── ia/      → FastAPI + Python — motor de IA/PLN
```

- **`web`** consome a API do `server` (autenticação, dados de usuário) e envia requisições de análise para o `ia`.
- **`server`** cuida de autenticação (JWT + refresh token rotativo), gestão de usuários e persistência via PostgreSQL.
- **`ia`** processa o dataset de vídeos, extrai padrões via PLN/clusterização e gera as recomendações estruturadas usando LLM.

Documentação específica de cada serviço:
- [`web/README.md`](./web/README.md)
- [`server/README.md`](./server/README.md)
- [`ia/README.md`](./ia/README.md)

## Stack

| Camada | Tecnologias |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query |
| Backend | Fastify 5, Prisma 7, PostgreSQL, Zod, JWT |
| IA/PLN | Python, FastAPI, UV, SBERT, HDBSCAN, Gemini |
| Infra | Docker Compose, Turborepo, GitHub Actions (CI/CD) |

## Rodando o projeto

Pré-requisitos: Node 24, Docker, [UV](https://docs.astral.sh/uv/) (para o serviço `ia`).

Instala dependências de todos os workspaces (incluindo Python via UV):

```bash
npm run install:all
```

Sobe Postgres + roda tudo em modo dev (`web:3000`, `server:3333`, `ia:8000`):

```bash
npm run dev
```

Cada serviço também roda isoladamente: `npm run dev:web`, `npm run dev:server`, `npm run dev:ia`.

Variáveis de ambiente: copie os arquivos `.env.example` de cada workspace (`web/`, `server/`, `ia/`) para `.env`.

### Banco de dados

```bash
npm run db:migrate   # roda migrations
npm run db:seed      # popula com dados de teste
npm run db:studio    # abre o Prisma Studio
```

## Testes

```bash
npm run test       # testes unitários/integração (turbo, todos os workspaces)
npm run test:e2e   # testes E2E (Playwright, sobe Docker automaticamente)
```

## CI/CD

GitHub Actions cuida de todo o pipeline: lint + type-check + testes em paralelo (Turborepo) nos três workspaces, testes E2E com Playwright, build de imagens Docker multi-arquitetura (amd64/arm64) para os três serviços, e abertura automática de PR de `dev` para `main` quando o CI passa. No merge em `main`, as imagens são publicadas no Docker Hub.