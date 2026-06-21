import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { NicheInput, RemoveNicheInput } from './niches.types.js'

/**
 * LISTAR POOL GLOBAL DE NICHOS
 * Retorna todos os nichos existentes no sistema, ordenados alfabeticamente.
 * Usado pelo front para popular o dropdown de seleção.
 */
export async function listAllNiches() {
  const niches = await prisma.niche.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  })

  return { niches }
}

/**
 * LISTAR NICHOS DO USUÁRIO LOGADO
 * Retorna apenas os nichos vinculados à conta do usuário.
 */
export async function listUserNiches(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  const userNiches = await prisma.userNiche.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      niche: {
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      },
    },
  })

  // Achata o resultado: [{ niche: {...} }] → [{ id, name, createdAt }]
  const niches = userNiches.map((entry) => entry.niche)

  return { niches }
}

/**
 * VINCULAR NICHO AO USUÁRIO (Criar se não existir)
 *
 * Fluxo:
 * 1. Recebe o nome já normalizado (lowercase, trim) pelo schema Zod.
 * 2. Faz upsert no pool global: cria o Niche se não existir, ou apenas busca o existente.
 * 3. Verifica se o usuário já tem esse nicho vinculado (evita duplicata na UserNiche).
 * 4. Cria o registro em UserNiche.
 *
 * Tanto "escrever um nome novo" quanto "selecionar um existente" chegam aqui da mesma forma.
 * O upsert garante que o comportamento seja idêntico nos dois casos.
 */
export async function addNicheToUser(userId: string, input: NicheInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  // Upsert no pool global: se o nicho já existe (pelo name único), apenas retorna; senão cria.
  const niche = await prisma.niche.upsert({
    where: { name: input.name },
    update: {},
    create: { name: input.name },
    select: {
      id: true,
      name: true,
      createdAt: true,
    },
  })

  // Verifica se o vínculo já existe para dar uma mensagem clara ao usuário
  const alreadyLinked = await prisma.userNiche.findUnique({
    where: {
      userId_nicheId: {
        userId,
        nicheId: niche.id,
      },
    },
  })

  if (alreadyLinked) {
    throw new AppError('Niche already linked to your account.', StatusCodes.CONFLICT)
  }

  // Cria o vínculo
  await prisma.userNiche.create({
    data: {
      userId,
      nicheId: niche.id,
    },
  })

  return { niche }
}

/**
 * DESVINCULAR NICHO DA CONTA
 *
 * Regra de negócio crítica: o usuário precisa ter ao menos 1 nicho.
 * Se for o último, a operação é bloqueada com erro explicativo.
 *
 * Importante: o Niche global NÃO é deletado — apenas o vínculo (UserNiche) é removido.
 * Isso preserva o pool global e o histórico de gerações que usaram esse nicho.
 */
export async function removeNicheFromUser(userId: string, input: RemoveNicheInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  // Verifica se o vínculo existe antes de tentar remover
  const userNiche = await prisma.userNiche.findUnique({
    where: {
      userId_nicheId: {
        userId,
        nicheId: input.id,
      },
    },
  })

  if (!userNiche) {
    throw new AppError('Niche not linked to your account.', StatusCodes.NOT_FOUND)
  }

  // Conta quantos nichos o usuário ainda tem
  const nicheCount = await prisma.userNiche.count({
    where: { userId },
  })

  // Regra de negócio: bloqueia a remoção se for o último nicho
  if (nicheCount <= 1) {
    throw new AppError(
      'You must have at least one niche. Add another before removing this one.',
      StatusCodes.UNPROCESSABLE_ENTITY,
    )
  }

  // Remove apenas o vínculo, preserva o Niche no pool global
  await prisma.userNiche.delete({
    where: {
      userId_nicheId: {
        userId,
        nicheId: input.id,
      },
    },
  })
}

/**
 * ESTATÍSTICAS DO POOL DE NICHOS (Admin)
 *
 * Retorna o total atual do pool global + o crescimento mensal
 * (quantos nichos foram criados em cada mês), para visualizar
 * se o pool está se expandindo rápido demais.
 */
export async function getNicheStats() {
  const total = await prisma.niche.count()

  const monthlyGrowthRaw = await prisma.$queryRaw<{ month: string; count: bigint }[]>`
    SELECT
      to_char(date_trunc('month', "created_at"), 'YYYY-MM') AS month,
      COUNT(*) AS count
    FROM "niches"
    GROUP BY date_trunc('month', "created_at")
    ORDER BY date_trunc('month', "created_at") ASC
  `

  const monthlyGrowth = monthlyGrowthRaw.map((row) => ({
    month: row.month,
    count: Number(row.count),
  }))

  return { total, monthlyGrowth }
}
