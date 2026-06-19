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
