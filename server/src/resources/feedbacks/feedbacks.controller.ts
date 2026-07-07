import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import * as feedbacksService from './feedbacks.service.js'
import type { FeedbackInput } from './feedbacks.types.js'

/**
 * ENVIAR FEEDBACK DE UMA GERAÇÃO
 * O ID da geração vem da rota aninhada (/generations/:id/feedback).
 */
export async function create(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  const { id: generationId } = request.params as { id: string }
  const body = request.body as FeedbackInput
  const { feedback } = await feedbacksService.upsertFeedback(userId, generationId, body)

  return reply.status(StatusCodes.OK).send({
    message: 'Feedback submitted successfully.',
    feedback,
  })
}

/**
 * ESTATÍSTICAS DE FEEDBACKS (Admin)
 */
export async function stats(request: FastifyRequest, reply: FastifyReply) {
  const { total, byType, byNiche } = await feedbacksService.getFeedbackStats()

  return reply.status(StatusCodes.OK).send({ total, byType, byNiche })
}
