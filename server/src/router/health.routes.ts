import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Infra'],
        summary: 'Health Check',
        description: 'Verifica se a API está no ar',
        // O ERRO ESTAVA AQUI: Antes era JSON puro, agora é Zod
        response: {
          200: z.object({
            status: z.string(),
            uptime: z.number(),
          }),
        },
      },
    },
    async () => {
      return {
        status: 'ok',
        uptime: process.uptime(),
      }
    },
  )
}
