import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { CreateGenerationInput, FavoriteUpdateInput, ListGenerationsQuery } from './generations.types.js'
import { Prisma } from '@prisma/client'

interface IaServiceResponse {
  nicho_solicitado: string
  nicho_utilizado: string
  fallback_usado: boolean
  structure_content: Record<string, unknown>
  script_content: Record<string, unknown>
}

/**
 * CRIAR GERAÇÃO
 *
 * Fluxo:
 * 1. Confirma que o nicho está vinculado à conta do usuário (evita gerar conteúdo pra nicho de outro)
 * 2. Chama o serviço de IA (FastAPI) passando o nome do nicho e o público-alvo
 * 3. Trata os possíveis erros do serviço de IA (nicho não encontrado, indisponível, falha na LLM)
 * 4. Persiste o resultado, guardando também o que foi solicitado e se houve fallback
 */
export async function createGeneration(userId: string, input: CreateGenerationInput) {
  const userNiche = await prisma.userNiche.findUnique({
    where: {
      userId_nicheId: {
        userId,
        nicheId: input.nicheId,
      },
    },
    select: {
      niche: {
        select: { id: true, name: true },
      },
    },
  })

  if (!userNiche) {
    throw new AppError('Niche not linked to your account.', StatusCodes.NOT_FOUND)
  }

  const iaServiceUrl = process.env.IA_SERVICE_URL

  if (!iaServiceUrl) {
    throw new AppError('IA service is not configured.', StatusCodes.INTERNAL_SERVER_ERROR)
  }

  let response: Response
  try {
    response = await fetch(`${iaServiceUrl}/analisar-nicho`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nicho: userNiche.niche.name,
        audience_country: input.audienceCountry ?? null,
      }),
    })
  } catch {
    throw new AppError('IA service is unreachable.', StatusCodes.BAD_GATEWAY)
  }

  if (response.status === StatusCodes.NOT_FOUND) {
    const body = await response.json().catch(() => null)
    throw new AppError(body?.detail ?? 'Niche not found by IA service.', StatusCodes.NOT_FOUND)
  }

  if (!response.ok) {
    throw new AppError('IA service failed to generate content.', StatusCodes.BAD_GATEWAY)
  }

  const data = (await response.json()) as IaServiceResponse

  const generation = await prisma.generation.create({
    data: {
      userId,
      nicheId: userNiche.niche.id,
      audienceCountry: input.audienceCountry ?? null,
      nicheRequested: data.nicho_solicitado,
      fallbackUsed: data.fallback_usado,
      structureContent: data.structure_content as Prisma.InputJsonValue,
      scriptContent: data.script_content as Prisma.InputJsonValue,
    },
  })

  return { generation }
}

/**
 * LISTAR GERAÇÕES DO USUÁRIO
 * Filtra por favorito quando informado na query (alimenta a tela de Favoritos).
 */
export async function listUserGenerations(userId: string, query: ListGenerationsQuery) {
  const generations = await prisma.generation.findMany({
    where: {
      userId,
      ...(query.favorite !== undefined ? { isFavorite: query.favorite } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return { generations }
}

/**
 * BUSCAR GERAÇÃO POR ID
 * Garante que a geração pertence ao usuário logado (não deixa ver geração de outra conta).
 */
export async function getGenerationById(userId: string, id: string) {
  const generation = await prisma.generation.findUnique({
    where: { id },
  })

  if (!generation || generation.userId !== userId) {
    throw new AppError('Generation not found.', StatusCodes.NOT_FOUND)
  }

  return { generation }
}

/**
 * MARCAR/DESMARCAR FAVORITO
 */
export async function updateFavorite(userId: string, id: string, input: FavoriteUpdateInput) {
  const { generation } = await getGenerationById(userId, id)

  const updated = await prisma.generation.update({
    where: { id: generation.id },
    data: { isFavorite: input.isFavorite },
  })

  return { generation: updated }
}

/**
 * ESTATÍSTICAS DE GERAÇÕES POR NICHO (Admin)
 *
 * Agrupa as gerações por nicho e resolve o nome de cada um,
 * pra alimentar o painel de uso (quais nichos geram mais conteúdo).
 */
export async function getGenerationStats() {
  const totalGenerations = await prisma.generation.count()

  const grouped = await prisma.generation.groupBy({
    by: ['nicheId'],
    _count: { _all: true },
    orderBy: { _count: { nicheId: 'desc' } },
  })

  const nicheIds = grouped.map((entry) => entry.nicheId)

  const niches = await prisma.niche.findMany({
    where: { id: { in: nicheIds } },
    select: { id: true, name: true },
  })

  const nicheNameById = new Map(niches.map((niche) => [niche.id, niche.name]))

  const byNiche = grouped.map((entry) => ({
    nicheId: entry.nicheId,
    nicheName: nicheNameById.get(entry.nicheId) ?? 'Unknown',
    count: entry._count._all,
  }))

  return { totalGenerations, byNiche }
}
