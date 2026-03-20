# ---------- 1. DEPS ----------
FROM node:24-alpine AS deps
# Adicionado para compatibilidade de bibliotecas nativas
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY web/package.json web/package.json
COPY server/package.json server/package.json

# Usamos npm ci para garantir fidelidade ao lockfile
RUN npm ci

# ---------- 2. BUILD ----------
FROM node:24-alpine AS build
WORKDIR /app

# Variáveis de build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
# Pula validação do Zod se alguma env de servidor faltar no build
ENV SKIP_ENV_VALIDATION=true

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build focado apenas no workspace web
RUN npm run build -w web

# ---------- 3. RUNTIME ----------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário de segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Ajuste de Permissão
RUN chown -R nextjs:nodejs /app

# No modo standalone do Monorepo, o Next copia a estrutura da raiz.
# Copiamos o conteúdo de standalone para a raiz do runner.
COPY --from=build --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# O ponto de entrada padrão do standalone em monorepos:
CMD ["node", "web/server.js"]