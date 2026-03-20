# --- 1. DEPS ---
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci

# --- 2. BUILD ---
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . . 
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV DATABASE_URL=$DATABASE_URL
WORKDIR /app/server
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# --- 3. RUNTIME ---
FROM node:24-alpine AS runner
WORKDIR /app

# Criamos o usuário e grupo de segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastifyuser

# --- CORREÇÃO DE PERMISSÃO ---
# Damos a posse da pasta /app para o fastifyuser ANTES das cópias
# para que ele possa criar o arquivo .env no CMD sem dar "Permission Denied"
RUN chown -R fastifyuser:nodejs /app

# Artefatos do server (copiando com as permissões certas)
COPY --from=builder --chown=fastifyuser:nodejs /app/server/dist ./dist
COPY --from=builder --chown=fastifyuser:nodejs /app/server/package.json ./package.json
COPY --from=builder --chown=fastifyuser:nodejs /app/server/prisma ./prisma
COPY --from=builder --chown=fastifyuser:nodejs /app/server/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=fastifyuser:nodejs /app/node_modules ./node_modules

USER fastifyuser
EXPOSE 3333

# O echo agora funciona porque o usuário é o dono da pasta. 
# Isso resolve o erro "datasource.url property is required" do Prisma.
# Usamos aspas simples no shell para proteger o valor da variável de expansões erradas
CMD ["sh", "-c", "echo DATABASE_URL=$DATABASE_URL > .env && npx prisma migrate deploy && node dist/src/server.js"]