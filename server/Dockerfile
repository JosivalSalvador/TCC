# ==========================================
# ESTÁGIO 1: BUILDER (Fica pesado, mas é descartado)
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /app

# Copia arquivos de dependência
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
COPY ia/package.json ./ia/

# Instala TODAS as dependências (incluindo devDependencies como TypeScript)
RUN npm ci --ignore-scripts

# Copia todo o código fonte
COPY . . 

# Cria o .env FALSO por segurança, apenas para o Prisma Generate funcionar
WORKDIR /app/server
RUN echo "DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy" > .env

# Executa o build do server (gera a pasta dist)
RUN npm run build


# ==========================================
# ESTÁGIO 2: RUNTIME (Minúsculo e Seguro)
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

# Cria usuário sem privilégios para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastifyuser

# Copia APENAS os pacotes necessários para instalar as dependências de produção
COPY package.json package-lock.json ./
COPY server/package.json ./server/

# O PULO DO GATO: Instala APENAS dependências de produção e APENAS do workspace server
RUN npm ci --omit=dev -w server --ignore-scripts

# Muda a posse da pasta app para o usuário seguro
RUN chown -R fastifyuser:nodejs /app

WORKDIR /app/server

# Copia do builder os arquivos de configuração do Prisma e package.json
COPY --from=builder --chown=fastifyuser:nodejs /app/server/package.json ./package.json
COPY --from=builder --chown=fastifyuser:nodejs /app/server/prisma ./prisma
COPY --from=builder --chown=fastifyuser:nodejs /app/server/prisma.config.ts ./prisma.config.ts

# GERAÇÃO DO PRISMA CLIENT EM PRODUÇÃO
# Passa a variável falsa direto na memória apenas para o comando rodar, sem precisar de arquivo .env
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copia do builder APENAS os arquivos finais compilados (dist)
COPY --from=builder --chown=fastifyuser:nodejs /app/server/dist ./dist

USER fastifyuser
EXPOSE 3333

# Comando final limpo: roda as migrations e inicia o servidor diretamente pelo Node
# Isso evita o `npm run start` que usava a flag `--env-file` problemática
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/server.js"]