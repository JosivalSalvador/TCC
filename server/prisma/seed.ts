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
  console.info('🔥 Iniciando Seed Completo do Portfólio...')
  const start = Date.now()

  // 1. Limpeza do banco na ordem correta (filhos primeiro)
  await prisma.token.deleteMany()
  await prisma.message.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  console.info('🧹 Banco de dados limpo com sucesso.')

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

  /*
   |--------------------------------------------------------------------------
   | 🚀 PROJETOS (CMS PORTFÓLIO)
   |--------------------------------------------------------------------------
   */
  console.info('🚀 Semeando Projetos...')
  await prisma.project.createMany({
    data: [
      {
        title: 'QualCel AI - Recomendador de Celulares',
        slug: 'qualcel-ai',
        description:
          'Plataforma impulsionada por IA para recomendar o melhor smartphone ' + 'de acordo com o seu perfil de uso.',
        content:
          '## Arquitetura\nEste projeto foi feito utilizando Next.js no ' +
          'frontend e uma API Python FastAPI conectada ao modelo da OpenAI ' +
          'para fazer as inferências.\n\n### Desafios\nO maior desafio foi ' +
          'otimizar o prompt para evitar alucinações da IA.',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
        githubUrl: 'https://github.com/seuusuario/qualcelai',
        liveUrl: 'https://qualcelai.vercel.app',
        tags: ['Next.js', 'FastAPI', 'OpenAI', 'TailwindCSS', 'PostgreSQL'],
        featured: true,
        views: 1254,
      },
      {
        title: 'CrocheDat - Gestão de Vendas',
        slug: 'crochedat',
        description: 'Dashboard administrativo para pequenas lojas de artesanato ' + 'controlarem estoque e vendas.',
        content:
          '<p>Sistema monolítico feito em Node.js com Fastify. ' +
          'Inclui relatórios em PDF gerados assincronamente.</p>',
        imageUrl: 'https://res.cloudinary.com/seuusuario/image/upload/imagem-quebrada.jpg',
        githubUrl: 'https://github.com/seuusuario/crochedat',
        liveUrl: null,
        tags: ['Node.js', 'Fastify', 'Prisma', 'React'],
        featured: false,
        views: 432,
      },
      {
        title: 'API de Integração Bancária (Confidencial)',
        slug: 'api-bancaria-confidencial',
        description: 'Microsserviço de conciliação bancária desenvolvido para uma ' + 'fintech sob NDA.',
        content:
          'Devido a contratos de confidencialidade (NDA), não posso exibir ' +
          'código ou prints da interface. O sistema processava mais de 10 ' +
          'mil transações por minuto utilizando RabbitMQ e workers em Go.',
        imageUrl: null,
        githubUrl: null,
        liveUrl: null,
        tags: ['Go', 'RabbitMQ', 'Docker', 'Kubernetes'],
        featured: true,
        views: 890,
      },
      {
        title: 'To-Do List com Sockets',
        slug: 'todo-list-sockets',
        description: 'Um app de tarefas colaborativo em tempo real.',
        content: 'Estudo de caso sobre WebSockets usando Socket.io e Redis ' + 'para pub/sub.',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1612461204/cld-sample-2.jpg',
        githubUrl: 'https://github.com/seuusuario/todo-sockets',
        liveUrl: 'https://todo-sockets.herokuapp.com',
        tags: ['Express', 'Socket.io', 'Redis'],
        featured: false,
        views: 12,
      },
    ],
  })

  /*
   |--------------------------------------------------------------------------
   | ✉️ MENSAGENS (CONTATO)
   |--------------------------------------------------------------------------
   */
  console.info('✉️ Semeando Mensagens de Contato...')
  await prisma.message.createMany({
    data: [
      {
        name: 'Tech Recruiter Nubank',
        email: 'recruiter@nubank.com.br',
        subject: 'Oportunidade de Engenheiro de Software Pleno',
        content:
          'Olá! Gostamos muito do seu perfil no LinkedIn e do projeto ' +
          'QualCel AI. Você teria disponibilidade para um bate-papo ' +
          'de 30 minutos na próxima semana?',
        isRead: false,
      },
      {
        name: 'João Startup',
        email: 'joao@novastartup.io',
        subject: 'Orçamento para Freelance',
        content:
          'Preciso de um sistema parecido com o CrocheDat, porém para ' + 'oficinas mecânicas. Qual o seu valor hora?',
        isRead: true,
      },
      {
        name: 'Visitante Curioso',
        email: 'teste123@hotmail.com',
        subject: null,
        content: 'Oi, só testando o formulário do seu site. Ficou muito bacana!',
        isRead: false,
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
