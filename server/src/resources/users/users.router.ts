import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { StatusCodes } from 'http-status-codes'
import * as usersController from './users.controller.js'
import { verifyJwt } from '../../middlewares/verify-jwt.js'
import { verifyUserRole } from '../../middlewares/verify-user-role.js'
// Importando TUDO do seu arquivo de schemas
import {
  registerUserSchema,
  updateUserSchema,
  updatePasswordSchema,
  updateRoleSchema,
  userResponseSchema,
} from './users.schema.js'

export async function usersRoutes(app: FastifyInstance) {
  const router = app.withTypeProvider<ZodTypeProvider>()

  /**
   * ROTA: Cadastro de Usuário
   * POST /users
   */
  router.post(
    '/users',
    {
      schema: {
        tags: ['users'],
        summary: 'Create a new account',
        body: registerUserSchema,
        response: {
          [StatusCodes.CREATED]: z.object({
            message: z.string(),
            userId: z.uuid(),
          }),
          [StatusCodes.CONFLICT]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    usersController.register,
  )

  /**
   * ROTA: Buscar perfil do usuário logado
   * GET /users/me
   */
  router.get(
    '/users/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['users'],
        summary: 'Get current user profile',
        response: {
          [StatusCodes.OK]: z.object({
            user: userResponseSchema,
          }),
        },
      },
    },
    usersController.getProfile,
  )

  /**
   * ROTA: Atualizar perfil
   * PATCH /users/me
   */
  router.patch(
    '/users/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['users'],
        summary: 'Update profile info',
        body: updateUserSchema, // Schema importado
        response: {
          [StatusCodes.OK]: z.object({
            message: z.string(),
            user: userResponseSchema,
          }),
        },
      },
    },
    usersController.updateProfile,
  )

  /**
   * ROTA: Alterar senha
   * POST /users/me/password
   */
  router.post(
    '/users/me/password',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['users'],
        summary: 'Change account password',
        body: updatePasswordSchema, // Schema importado
        response: {
          [StatusCodes.OK]: z.object({
            message: z.string(),
          }),
          [StatusCodes.BAD_REQUEST]: z.object({
            message: z.string(),
          }),
        },
      },
    },
    usersController.changePassword,
  )

  /**
   * ROTA: Deletar própria conta (Usuário Logado)
   * DELETE /users/me
   */
  router.delete(
    '/users/me',
    {
      onRequest: [verifyJwt],
      schema: {
        tags: ['users'],
        summary: 'Delete my own account',
        response: {
          [StatusCodes.NO_CONTENT]: z.null().describe('No content'),
        },
      },
    },
    usersController.deleteAccount,
  )

  /**
   * ROTA: Listar todos (Admin)
   * GET /users
   */
  router.get(
    '/users',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'List all users (Admin only)',
        response: {
          [StatusCodes.OK]: z.object({
            users: z.array(userResponseSchema),
          }),
        },
      },
    },
    usersController.listAll,
  )

  /**
   * ROTA: Mudar Role (Admin)
   * PATCH /users/:id/role
   */
  router.patch(
    '/users/:id/role',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'Change user role (Admin only)',
        params: z.object({ id: z.uuid() }),
        body: updateRoleSchema, // Schema importado
        response: {
          [StatusCodes.OK]: z.object({
            message: z.string(),
            user: userResponseSchema, // Reaproveitando o schema de resposta
          }),
        },
      },
    },
    usersController.updateRole,
  )

  /**
   * ROTA: Deletar Usuário (Admin)
   * DELETE /users/:id
   */
  router.delete(
    '/users/:id',
    {
      onRequest: [verifyJwt, verifyUserRole('ADMIN')],
      schema: {
        tags: ['admin'],
        summary: 'Delete any user (Admin only)',
        params: z.object({ id: z.uuid() }),
        response: {
          [StatusCodes.NO_CONTENT]: z.null().describe('No content'),
        },
      },
    },
    usersController.adminDelete,
  )
}
