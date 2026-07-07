import type { FastifyInstance } from 'fastify'
import { usersRoutes } from '../resources/users/users.router.js' // Importar
import { sessionsRoutes } from '../resources/auth/sessions.router.js' // Importar
import { refreshRoutes } from '../resources/tokens/refresh.router.js' // Importar
import { feedbacksRoutes } from '../resources/feedbacks/feedbacks.router.js'
import { generationsRoutes } from '../resources/generations/generations.router.js'
import { nichesRoutes } from '../resources/niches/niches.router.js'

export async function routesV1(app: FastifyInstance) {
  // Aqui você registra todos os recursos da versão 1
  app.register(usersRoutes)
  app.register(sessionsRoutes)
  app.register(refreshRoutes)
  app.register(feedbacksRoutes)
  app.register(generationsRoutes)
  app.register(nichesRoutes)
}
