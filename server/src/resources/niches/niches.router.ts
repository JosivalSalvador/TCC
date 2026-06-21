import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import * as nichesController from './niches.controller.js'
import { verifyJwt } from '../../middlewares/verify-jwt.js'
import { verifyUserRole } from '../../middlewares/verify-user-role.js'
import { nicheInputSchema, nicheResponseSchema, removeNicheSchema, nicheStatsResponseSchema } from './niches.schema.js'

export async function nichesRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Listar pool global de nichos
   * GET /niches
   *
   * Pública — alimenta o dropdown de seleção na tela de cadastro e gerenciamento.
   * Não exige JWT porque o front precisa desse dado antes do usuário estar logado.
   */
  router.get(
    '/niches',
    {
      schema: {
        tags: ['niches'],
        summary: 'List all niches (global pool)',
        response: {
          [StatusCodes.OK]: z.object({
            niches: z.array(nicheResponseSchema),
          }),
        },
      },
    },
    nichesController.listAll,
  )

  /**
   * ROTA: Listar nichos do usuário logado
   * GET /niches/me
   */
  router.get(
    '/niches/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['niches'],
        summary: 'List niches linked to the current user',
        response: {
          [StatusCodes.OK]: z.object({
            niches: z.array(nicheResponseSchema),
          }),
        },
      },
    },
    nichesController.listMine,
  )

  /**
   * ROTA: Vincular nicho à conta
   * POST /niches/me
   *
   * Recebe o nome do nicho — digitado ou selecionado, chega igual ao servidor.
   * O service resolve o upsert no pool global e cria o vínculo.
   */
  router.post(
    '/niches/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['niches'],
        summary: 'Link a niche to the current user account',
        body: nicheInputSchema,
        response: {
          [StatusCodes.CREATED]: z.object({
            message: z.string(),
            niche: nicheResponseSchema,
          }),
          [StatusCodes.CONFLICT]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    nichesController.addNiche,
  )

  /**
   * ROTA: Desvincular nicho da conta
   * DELETE /niches/me/:id
   *
   * Bloqueia a remoção se for o último nicho do usuário (422).
   * O nicho permanece no pool global — apenas o vínculo é removido.
   */
  router.delete(
    '/niches/me/:id',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['niches'],
        summary: 'Unlink a niche from the current user account',
        params: removeNicheSchema,
        response: {
          [StatusCodes.NO_CONTENT]: z.null().describe('No content'),
          [StatusCodes.UNPROCESSABLE_ENTITY]: z.object({
            message: z.string(),
          }),
          [StatusCodes.NOT_FOUND]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    nichesController.removeNiche,
  )

  /**
   * ROTA: Estatísticas do pool de nichos
   * GET /niches/stats
   *
   * Exclusiva Admin — total atual do pool global + crescimento mensal
   * (nichos criados por mês), para acompanhar se o pool está se
   * expandindo rápido demais.
   */
  router.get(
    '/niches/stats',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'Get niche pool statistics (Admin only)',
        response: {
          [StatusCodes.OK]: nicheStatsResponseSchema,
        },
      },
    },
    nichesController.stats,
  )
}
