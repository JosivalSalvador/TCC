import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import * as refreshController from './refresh.controller.js'
import { tokenResponseSchema, tokenErrorSchema } from './tokens.schema.js' // ← ADICIONADO: Importando os schemas globais

export async function refreshRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Refresh Token
   * PATCH /token/refresh
   * O Fastify lerá automaticamente o cookie 'refreshToken' assinado.
   */
  router.patch(
    '/token/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Refresh User Token',
        description: 'Troca o Refresh Token (via HttpOnly Cookie) por um novo Access Token (JWT).',
        response: {
          [StatusCodes.OK]: tokenResponseSchema, // ← ATUALIZADO: Usando o schema importado
          [StatusCodes.UNAUTHORIZED]: tokenErrorSchema, // ← ATUALIZADO: Usando o schema importado
        },
      },
    },
    refreshController.refresh,
  )
}
