import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { FeedbackInput } from './feedbacks.types.js'

/**
 * ENVIAR FEEDBACK DE UMA GERAÇÃO
 *
 * Fluxo:
 * 1. Confirma que a geração existe e pertence ao usuário logado
 * 2. Faz upsert pelo par único (generationId + type) — se o usuário já
 *    avaliou esse tipo antes, atualiza isUseful em vez de duplicar
 */
export async function upsertFeedback(userId: string, generationId: string, input: FeedbackInput) {
  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
  })

  if (!generation || generation.userId !== userId) {
    throw new AppError('Generation not found.', StatusCodes.NOT_FOUND)
  }

  const feedback = await prisma.generationFeedback.upsert({
    where: {
      generationId_type: {
        generationId,
        type: input.type,
      },
    },
    update: {
      isUseful: input.isUseful,
    },
    create: {
      generationId,
      type: input.type,
      isUseful: input.isUseful,
    },
  })

  return { feedback }
}

/**
 * ESTATÍSTICAS DE FEEDBACKS (Admin)
 *
 * Retorna:
 * - total de feedbacks no sistema
 * - agregação por type (STRUCTURE/SCRIPT) com % de úteis
 * - agregação por nicho, com STRUCTURE e SCRIPT separados, cada um com % de úteis
 */
export async function getFeedbackStats() {
  const all = await prisma.generationFeedback.findMany({
    select: {
      type: true,
      isUseful: true,
      generation: {
        select: {
          nicheId: true,
          niche: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })

  const total = all.length

  // ── Por type ──────────────────────────────────────────────
  const typeMap = new Map<string, { count: number; usefulCount: number }>()

  for (const fb of all) {
    const entry = typeMap.get(fb.type) ?? { count: 0, usefulCount: 0 }
    entry.count++
    if (fb.isUseful) entry.usefulCount++
    typeMap.set(fb.type, entry)
  }

  const byType = Array.from(typeMap.entries()).map(([type, data]) => ({
    type: type as 'STRUCTURE' | 'SCRIPT',
    count: data.count,
    usefulCount: data.usefulCount,
    usefulPercent: data.count > 0 ? Math.round((data.usefulCount / data.count) * 100) : 0,
  }))

  // ── Por nicho ─────────────────────────────────────────────
  type NicheAgg = {
    nicheName: string
    structure: { count: number; usefulCount: number }
    script: { count: number; usefulCount: number }
  }

  const nicheMap = new Map<string, NicheAgg>()

  for (const fb of all) {
    const { nicheId, niche } = fb.generation
    const entry = nicheMap.get(nicheId) ?? {
      nicheName: niche.name,
      structure: { count: 0, usefulCount: 0 },
      script: { count: 0, usefulCount: 0 },
    }

    const slot = fb.type === 'STRUCTURE' ? entry.structure : entry.script
    slot.count++
    if (fb.isUseful) slot.usefulCount++

    nicheMap.set(nicheId, entry)
  }

  const byNiche = Array.from(nicheMap.entries()).map(([nicheId, data]) => ({
    nicheId,
    nicheName: data.nicheName,
    structure: {
      count: data.structure.count,
      usefulCount: data.structure.usefulCount,
      usefulPercent:
        data.structure.count > 0 ? Math.round((data.structure.usefulCount / data.structure.count) * 100) : 0,
    },
    script: {
      count: data.script.count,
      usefulCount: data.script.usefulCount,
      usefulPercent: data.script.count > 0 ? Math.round((data.script.usefulCount / data.script.count) * 100) : 0,
    },
  }))

  return { total, byType, byNiche }
}
