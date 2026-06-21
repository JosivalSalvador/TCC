import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import * as feedbacksController from './feedbacks.controller.js'
import { verifyJwt } from '../../middlewares/verify-jwt.js'
import { verifyUserRole } from '../../middlewares/verify-user-role.js'
import { feedbackInputSchema, feedbackResponseSchema, feedbackStatsResponseSchema } from './feedbacks.schema.js'

export async function feedbacksRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Enviar feedback de uma geração
   * POST /generations/:id/feedback
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

  /**
   * ROTA: Estatísticas de feedbacks
   * GET /feedbacks/stats
   */
  router.get(
    '/feedbacks/stats',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'Get feedback statistics (Admin only)',
        response: {
          [StatusCodes.OK]: z.object({
            total: z.number(),
            byType: feedbackStatsResponseSchema.shape.byType,
            byNiche: feedbackStatsResponseSchema.shape.byNiche,
          }),
        },
      },
    },
    feedbacksController.stats,
  )
}
