import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import * as feedbacksController from './feedbacks.controller.js'
import { verifyJwt } from '../../middlewares/verify-jwt.js'
import { feedbackInputSchema, feedbackResponseSchema } from './feedbacks.schema.js'

export async function feedbacksRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Enviar feedback de uma geração
   * POST /generations/:id/feedback
   *
   * Aninhada em generations porque feedback não existe sem uma geração.
   * Upsert: se o usuário já avaliou esse type antes, atualiza em vez de duplicar.
   */
  router.post(
    '/generations/:id/feedback',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['feedbacks'],
        summary: 'Submit feedback (structure or script) for a generation',
        params: z.object({ id: z.uuid() }),
        body: feedbackInputSchema,
        response: {
          [StatusCodes.OK]: z.object({
            message: z.string(),
            feedback: feedbackResponseSchema,
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    feedbacksController.create,
  )
}
