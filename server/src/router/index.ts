import type { FastifyInstance } from 'fastify'
import { routesV1 } from './v1.js'

export async function routes(app: FastifyInstance) {
  // Registra a V1 com o prefixo global
  app.register(routesV1, { prefix: '/api/v1' })
}
