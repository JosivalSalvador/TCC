import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
// ← ATUALIZADO: Importando nossos schemas de resposta centralizados
import { loginSchema, loginResponseSchema, authErrorSchema } from './sessions.schema.js'
import * as sessionsController from './sessions.controller.js'

export async function sessionsRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Autenticação (Login)
   */
  router.post(
    '/sessions',
    {
      schema: {
        tags: ['auth'],
        summary: 'Authenticate with email and password',
        body: loginSchema,
        response: {
          // ← ATUALIZADO: Código absurdamente mais limpo e seguro!
          [StatusCodes.OK]: loginResponseSchema,
          [StatusCodes.UNAUTHORIZED]: authErrorSchema,
        },
      },
    },
    sessionsController.authenticate,
  )

  /**
   * ROTA: Logout
   */
  router.post(
    '/sessions/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign out and invalidate refresh token',
        // AJUSTE DE MERCADO: Forçamos o Zod a entender que não há body.
        // Isso ajuda o Fastify a não exigir Content-Type: application/json.
        body: z.null().optional(),
        response: {
          [StatusCodes.NO_CONTENT]: z.null().describe('No content'),
        },
      },
    },
    sessionsController.logout,
  )
}
