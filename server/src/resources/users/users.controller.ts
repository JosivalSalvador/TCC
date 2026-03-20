import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'
import * as usersService from './users.service.js'
import type { RegisterUserInput, UpdatePasswordInput, UpdateRoleInput, UpdateUserInput } from './users.types.js'

/**
 * Registro de Usuário
 */
export async function register(request: FastifyRequest, reply: FastifyReply) {
  // Ajuste aqui: cast de tipo na variável
  const { name, email, password } = request.body as RegisterUserInput
  const { user } = await usersService.registerUser({ name, email, password })

  return reply.status(StatusCodes.CREATED).send({
    message: 'User created successfully.',
    userId: user.id,
  })
}

/**
 * BUSCAR PERFIL (O próprio usuário logado)
 */
export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  // O ID vem do middleware de autenticação (JWT)
  const userId = request.user.sub
  const { user } = await usersService.getUserById(userId)

  return reply.status(StatusCodes.OK).send({ user })
}

/**
 * ATUALIZAR PERFIL (Nome e Email)
 */
export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  // Ajuste aqui: cast de tipo na variável
  const body = request.body as UpdateUserInput
  const { user } = await usersService.updateUser(userId, body)

  return reply.status(StatusCodes.OK).send({
    message: 'Profile updated successfully.',
    user,
  })
}

/**
 * ALTERAR SENHA
 */
export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  // Ajuste aqui: cast de tipo na variável
  const body = request.body as UpdatePasswordInput
  await usersService.updatePassword(userId, body)

  return reply.status(StatusCodes.OK).send({ message: 'Password updated successfully.' })
}

/**
 * DELETAR PRÓPRIA CONTA
 */
export async function deleteAccount(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user.sub
  await usersService.deleteUser(userId)

  return reply.clearCookie('refreshToken').status(StatusCodes.NO_CONTENT).send()
}

// ==========================================
// 🛡️ MÉTODOS EXCLUSIVOS DE ADMIN
// ==========================================

/**
 * LISTAR TODOS (Admin)
 */
export async function listAll(request: FastifyRequest, reply: FastifyReply) {
  const { users } = await usersService.listAllUsers()
  return reply.status(StatusCodes.OK).send({ users })
}

/**
 * ATUALIZAR CARGO (Admin promovendo alguém)
 */
export async function updateRole(request: FastifyRequest, reply: FastifyReply) {
  // Ajuste aqui: cast de tipo nas variáveis
  const { id } = request.params as { id: string }
  const body = request.body as UpdateRoleInput
  const { user } = await usersService.updateUserRole(id, body)

  return reply.status(StatusCodes.OK).send({
    message: 'User role updated successfully.',
    user,
  })
}

/**
 * BANIR/DELETAR USUÁRIO (Admin removendo alguém)
 */
export async function adminDelete(request: FastifyRequest, reply: FastifyReply) {
  // Ajuste aqui: cast de tipo na variável
  const { id } = request.params as { id: string }
  await usersService.deleteUser(id)

  return reply.status(StatusCodes.NO_CONTENT).send()
}
