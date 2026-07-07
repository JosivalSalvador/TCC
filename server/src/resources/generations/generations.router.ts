import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import * as generationsController from './generations.controller.js'
import { verifyJwt } from '../../middlewares/verify-jwt.js'
import { verifyUserRole } from '../../middlewares/verify-user-role.js'
import {
  createGenerationSchema,
  listGenerationsQuerySchema,
  favoriteUpdateSchema,
  generationResponseSchema,
  generationStatsResponseSchema,
} from './generations.schema.js'

export async function generationsRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Criar geração
   * POST /generations
   *
   * Chama o serviço de IA com o nicho escolhido e persiste o resultado.
   */
  router.post(
    '/generations',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['generations'],
        summary: 'Generate video structure + script for a niche',
        body: createGenerationSchema,
        response: {
          [StatusCodes.CREATED]: z.object({
            message: z.string(),
            generation: generationResponseSchema,
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            message: z.string(),
          }),
          [StatusCodes.BAD_GATEWAY]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    generationsController.create,
  )

  /**
   * ROTA: Listar gerações do usuário logado
   * GET /generations
   *
   * Aceita ?favorite=true|false para alimentar a tela de Favoritos.
   */
  router.get(
    '/generations',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['generations'],
        summary: 'List generations for the current user',
        querystring: listGenerationsQuerySchema,
        response: {
          [StatusCodes.OK]: z.object({
            generations: z.array(generationResponseSchema),
          }),
        },
      },
    },
    generationsController.list,
  )

  /**
   * ROTA: Estatísticas de gerações por nicho
   * GET /generations/stats
   *
   * Exclusiva Admin — precisa vir ANTES de /generations/:id,
   * senão o Fastify tenta casar "stats" como :id (UUID) e quebra a validação.
   */
  router.get(
    '/generations/stats',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'Get generation statistics by niche (Admin only)',
        response: {
          [StatusCodes.OK]: generationStatsResponseSchema,
        },
      },
    },
    generationsController.stats,
  )

  /**
   * ROTA: Buscar geração específica
   * GET /generations/:id
   */
  router.get(
    '/generations/:id',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['generations'],
        summary: 'Get a specific generation',
        params: z.object({ id: z.uuid() }),
        response: {
          [StatusCodes.OK]: z.object({
            generation: generationResponseSchema,
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    generationsController.getOne,
  )

  /**
   * ROTA: Marcar/desmarcar favorito
   * PATCH /generations/:id/favorite
   */
  router.patch(
    '/generations/:id/favorite',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['generations'],
        summary: 'Mark or unmark a generation as favorite',
        params: z.object({ id: z.uuid() }),
        body: favoriteUpdateSchema,
        response: {
          [StatusCodes.OK]: z.object({
            message: z.string(),
            generation: generationResponseSchema,
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    generationsController.updateFavorite,
  )
}
