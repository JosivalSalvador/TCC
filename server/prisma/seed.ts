import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role, TokenType } from '@prisma/client'
import { hash } from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is required')

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.info('🔥 Iniciando Seed do Sistema...')
  const start = Date.now()

  // 1. Limpeza do banco na ordem correta (filhos primeiro)
  await prisma.generationFeedback.deleteMany()
  await prisma.generation.deleteMany()
  await prisma.userNiche.deleteMany()
  await prisma.niche.deleteMany()
  await prisma.token.deleteMany()
  await prisma.user.deleteMany()
  console.info('🧹 Banco de dados limpo com sucesso.')

  /*
   |--------------------------------------------------------------------------
   | 🎯 NICHOS
   |--------------------------------------------------------------------------
   */
  console.info('🎯 Semeando Nichos...')

  const nicheNames = ['historias_denso', 'esquetes', 'satisfying', 'street_interview', 'tech_review']

  const niches = await Promise.all(
    nicheNames.map((name) =>
      prisma.niche.create({
        data: { name },
      }),
    ),
  )

  const DEFAULT_PASSWORD = '@Js92434212'
  const passwordHash = await hash(DEFAULT_PASSWORD, 10)

  /*
   |--------------------------------------------------------------------------
   | 👥 USUÁRIOS
   |--------------------------------------------------------------------------
   */
  console.info('👤 Semeando Usuários...')

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Sistema',
      email: 'josivaladm@gmail.com',
      password_hash: passwordHash,
      role: Role.ADMIN,
    },
  })

  const supporter = await prisma.user.create({
    data: {
      name: 'Suporte Maria',
      email: 'josivalsup@gmail.com',
      password_hash: passwordHash,
      role: Role.SUPPORTER,
    },
  })

  const client1 = await prisma.user.create({
    data: {
      name: 'Cliente Exemplo 1',
      email: 'josivaluser@gmail.com',
      password_hash: passwordHash,
      role: Role.USER,
    },
  })

  const client2 = await prisma.user.create({
    data: {
      name: 'Cliente Exemplo 2',
      email: 'josivaluser2@gmail.com',
      password_hash: passwordHash,
      role: Role.USER,
    },
  })

  /*
   |--------------------------------------------------------------------------
   | 🔗 VÍNCULOS USUÁRIO <-> NICHO (todos os 5 nichos para cada usuário)
   |--------------------------------------------------------------------------
   */
  console.info('🔗 Vinculando nichos aos usuários...')

  const allUsers = [admin, supporter, client1, client2]

  await prisma.userNiche.createMany({
    data: allUsers.flatMap((user) =>
      niches.map((niche) => ({
        userId: user.id,
        nicheId: niche.id,
      })),
    ),
  })

  /*
   |--------------------------------------------------------------------------
   | 🔑 TOKENS
   |--------------------------------------------------------------------------
   */
  console.info('🔑 Semeando Tokens para TODOS os usuários...')

  await prisma.token.createMany({
    data: [
      {
        type: TokenType.REFRESH_TOKEN,
        userId: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Admin: 7 dias
      },
      {
        type: TokenType.REFRESH_TOKEN,
        userId: supporter.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Suporte: 1 dia
      },
      {
        type: TokenType.REFRESH_TOKEN,
        userId: client1.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Cliente 1: 1 hora
      },
      {
        type: TokenType.REFRESH_TOKEN,
        userId: client2.id,
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // Cliente 2: Expirado
      },
    ],
  })

  const end = Date.now()
  console.info(`\n✅ Seed finalizado com sucesso em ${end - start}ms`)
  console.info('--------------------------------------------------')
  console.info('🧪 CREDENCIAIS PARA O SEU FRONTEND / E2E:')
  console.info(`👤 Admin:   josivaladm@gmail.com   | Senha: ${DEFAULT_PASSWORD}`)
  console.info(`🎧 Suporte: josivalsup@gmail.com | Senha: ${DEFAULT_PASSWORD}`)
  console.info(`🛒 Cliente: josivaluser@gmail.com  | Senha: ${DEFAULT_PASSWORD}`)
  console.info(`🛒 Cliente: josivaluser2@gmail.com | Senha: ${DEFAULT_PASSWORD}`)
  console.info('--------------------------------------------------')
  console.info('🎯 Nichos criados:', nicheNames.join(', '))
  console.info('--------------------------------------------------')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error('❌ Erro Fatal no Seed:', e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
