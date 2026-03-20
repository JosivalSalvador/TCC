
```
TCC
├─ .dockerignore
├─ .husky
│  ├─ _
│  │  └─ husky.sh
│  └─ pre-commit
├─ README.md
├─ docker-compose.dev.yml
├─ docker-compose.yml
├─ ia
│  ├─ .python-version
│  ├─ README.md
│  ├─ main.py
│  ├─ package.json
│  └─ pyproject.toml
├─ package-lock.json
├─ package.json
├─ server
│  ├─ .prettierrc
│  ├─ Dockerfile
│  ├─ README.md
│  ├─ eslint.config.ts
│  ├─ package.json
│  ├─ prisma
│  │  ├─ schema.prisma
│  │  └─ seed.ts
│  ├─ prisma.config.ts
│  ├─ src
│  │  ├─ @types
│  │  │  └─ fastify-jwt.d.ts
│  │  ├─ app.ts
│  │  ├─ errors
│  │  │  └─ app-error.ts
│  │  ├─ lib
│  │  │  ├─ error-handler.ts
│  │  │  └─ prisma.ts
│  │  ├─ middlewares
│  │  │  ├─ verify-jwt.ts
│  │  │  └─ verify-user-role.ts
│  │  ├─ resources
│  │  │  ├─ auth
│  │  │  │  ├─ sessions.controller.ts
│  │  │  │  ├─ sessions.router.ts
│  │  │  │  ├─ sessions.schema.ts
│  │  │  │  ├─ sessions.service.ts
│  │  │  │  ├─ sessions.types.ts
│  │  │  │  └─ tests
│  │  │  │     ├─ sessions.controller.spec.ts
│  │  │  │     └─ sessions.service.spec.ts
│  │  │  ├─ tokens
│  │  │  │  ├─ refresh.controller.ts
│  │  │  │  ├─ refresh.router.ts
│  │  │  │  ├─ refresh.service.ts
│  │  │  │  ├─ tests
│  │  │  │  │  ├─ refresh.controller.spec.ts
│  │  │  │  │  └─ refresh.service.spec.ts
│  │  │  │  ├─ tokens.schema.ts
│  │  │  │  └─ tokens.types.ts
│  │  │  └─ users
│  │  │     ├─ tests
│  │  │     │  ├─ users.controller.spec.ts
│  │  │     │  └─ users.service.spec.ts
│  │  │     ├─ users.controller.ts
│  │  │     ├─ users.router.ts
│  │  │     ├─ users.schema.ts
│  │  │     ├─ users.service.ts
│  │  │     └─ users.types.ts
│  │  ├─ router
│  │  │  ├─ health.routes.ts
│  │  │  ├─ index.ts
│  │  │  └─ v1.ts
│  │  ├─ server.ts
│  │  └─ validateEnv
│  │     └─ index.ts
│  ├─ tsconfig.json
│  └─ vitest.config.ts
├─ turbo.json
└─ web
   ├─ Dockerfile
   ├─ README.md
   ├─ actions
   │  ├─ auth.actions.ts
   │  └─ users.actions.ts
   ├─ app
   │  ├─ (admin)
   │  │  ├─ dashboard
   │  │  │  ├─ (home)
   │  │  │  │  ├─ loading.tsx
   │  │  │  │  └─ page.tsx
   │  │  │  └─ _components
   │  │  └─ layout.tsx
   │  ├─ (auth)
   │  │  ├─ _components
   │  │  │  ├─ login-form.tsx
   │  │  │  └─ register-form.tsx
   │  │  ├─ layout.tsx
   │  │  ├─ login
   │  │  │  ├─ loading.tsx
   │  │  │  └─ page.tsx
   │  │  └─ register
   │  │     ├─ loading.tsx
   │  │     └─ page.tsx
   │  ├─ (public)
   │  │  ├─ (home)
   │  │  │  ├─ loading.tsx
   │  │  │  └─ page.tsx
   │  │  ├─ _components
   │  │  └─ layout.tsx
   │  ├─ (sandbox)
   │  │  ├─ _components
   │  │  ├─ home
   │  │  │  ├─ loading.tsx
   │  │  │  └─ page.tsx
   │  │  └─ layout.tsx
   │  ├─ apple-icon.png
   │  ├─ error.tsx
   │  ├─ globals.css
   │  ├─ icon.png
   │  ├─ layout.tsx
   │  ├─ not-found.tsx
   │  └─ providers.tsx
   ├─ components
   │  └─ ui
   │     ├─ alert-dialog.tsx
   │     ├─ alert.tsx
   │     ├─ avatar.tsx
   │     ├─ badge.tsx
   │     ├─ breadcrumb.tsx
   │     ├─ button.tsx
   │     ├─ card.tsx
   │     ├─ carousel.tsx
   │     ├─ dialog.tsx
   │     ├─ dropdown-menu.tsx
   │     ├─ form.tsx
   │     ├─ grid-background.tsx
   │     ├─ input.tsx
   │     ├─ label.tsx
   │     ├─ select.tsx
   │     ├─ separator.tsx
   │     ├─ sheet.tsx
   │     ├─ skeleton.tsx
   │     ├─ sonner.tsx
   │     ├─ spotlight.tsx
   │     ├─ table.tsx
   │     └─ textarea.tsx
   ├─ components.json
   ├─ e2e
   │  ├─ admin.spec.ts
   │  ├─ auth.spec.ts
   │  └─ public.spec.ts
   ├─ eslint.config.mjs
   ├─ global-setup.ts
   ├─ global-teardown.ts
   ├─ hooks
   │  ├─ use-auth.ts
   │  └─ use-users.ts
   ├─ lib
   │  ├─ animations
   │  │  └─ fade.ts
   │  ├─ api
   │  │  ├─ http-client.test.ts
   │  │  └─ http-client.ts
   │  ├─ auth
   │  │  ├─ session.test.ts
   │  │  └─ session.ts
   │  ├─ query
   │  │  └─ query-client.ts
   │  └─ utils
   │     ├─ env.ts
   │     ├─ utils.test.ts
   │     └─ utils.ts
   ├─ next-env.d.ts
   ├─ next.config.ts
   ├─ package.json
   ├─ playwright.config.ts
   ├─ postcss.config.mjs
   ├─ proxy.ts
   ├─ public
   │  ├─ file.svg
   │  ├─ globe.svg
   │  ├─ next.svg
   │  ├─ vercel.svg
   │  └─ window.svg
   ├─ schemas
   │  ├─ refresh.schema.ts
   │  ├─ sessions.schema.ts
   │  └─ users.schema.ts
   ├─ services
   │  ├─ auth.service.ts
   │  └─ users.service.ts
   ├─ tsconfig.json
   ├─ tsconfig.tsbuildinfo
   ├─ types
   │  ├─ enums.ts
   │  ├─ index.ts
   │  ├─ refresh.types.ts
   │  ├─ sessions.types.ts
   │  └─ users.types.ts
   ├─ types.d.ts
   ├─ vitest.config.ts
   └─ vitest.setup.ts

```