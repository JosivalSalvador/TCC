# ========== 1. DEPS (Instala tudo) ==========
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copia TODOS os package.json para o lockfile da raiz não quebrar
COPY package.json package-lock.json ./
COPY web/package.json web/
COPY server/package.json server/
COPY ia/package.json ia/

RUN npm ci --ignore-scripts

# ========== 2. BUILD (Compila e gera o Standalone) ==========
FROM node:24-alpine AS build
WORKDIR /app

# Argumentos e Variáveis de Build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV SKIP_ENV_VALIDATION=true

COPY --from=deps /app/node_modules ./node_modules
# Copia tudo (vital porque o web importa tipos do @server/*)
COPY . .

# Roda o build apenas do web
RUN npm run build -w web

# ========== 3. RUNTIME (Imagem final minúscula) ==========
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Ajuste de Permissão
RUN chown -R nextjs:nodejs /app

# PULO DO GATO: Copia APENAS a pasta standalone (livre do IA e do Server)
# Em monorepos, o Next.js reproduz a estrutura de pastas dentro do standalone
COPY --from=build --chown=nextjs:nodejs /app/web/.next/standalone ./

# Copia os arquivos estáticos para os lugares exatos que o Next procura
COPY --from=build --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=build --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs

EXPOSE 3000

# Executa o servidor otimizado do Next.js
CMD ["node", "web/server.js"]