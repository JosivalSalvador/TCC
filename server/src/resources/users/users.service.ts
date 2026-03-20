import { hash, compare } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { RegisterUserInput, UpdatePasswordInput, UpdateRoleInput, UpdateUserInput } from './users.types.js'

/**
 * Cria um novo usuário no sistema
 */
export async function registerUser(input: RegisterUserInput) {
  const { name, email, password } = input

  const userExists = await prisma.user.findUnique({
    where: { email },
  })

  if (userExists) {
    throw new AppError('E-mail already exists.', StatusCodes.CONFLICT)
  }

  const passwordHash = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return { user }
}

/**
 * BUSCAR POR ID (Comum)
 * Usada pelo usuário para ver seu perfil ou pelo Admin para ver detalhes de alguém.
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  return { user }
}

/**
 * EDITAR PERFIL (Comum)
 * Altera apenas Nome e E-mail. Note que o 'role' não entra aqui por segurança.
 */
export async function updateUser(userId: string, data: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  // Se estiver tentando mudar o e-mail, verifica se o novo já está em uso
  if (data.email && data.email !== user.email) {
    const emailExists = await prisma.user.findUnique({ where: { email: data.email } })
    if (emailExists) {
      throw new AppError('E-mail already in use.', StatusCodes.CONFLICT)
    }
  }

  // Limpeza para evitar erro de 'undefined' no Prisma (exactOptionalPropertyTypes)
  const updateData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined))

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  return { user: updatedUser }
}

/**
 * ALTERAR SENHA (Comum)
 * Valida a senha antiga antes de permitir a troca.
 */
export async function updatePassword(userId: string, input: UpdatePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  // 1. Verificar se a senha antiga enviada bate com a do banco
  const isOldPasswordCorrect = await compare(input.oldPassword, user.password_hash)

  if (!isOldPasswordCorrect) {
    throw new AppError('Old password does not match.', StatusCodes.BAD_REQUEST)
  }

  // 2. Gerar hash da nova senha
  const newPasswordHash = await hash(input.newPassword, 10)

  // 3. Atualizar no banco
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newPasswordHash },
  })
}

/**
 * DELETAR CONTA (Comum)
 * Remove o usuário e dispara o Cascade do Prisma (limpa tokens, carrinhos, etc).
 */
export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  await prisma.user.delete({ where: { id: userId } })
}

/**
 * LISTAR TODOS OS USUÁRIOS (Exclusivo Admin)
 * Retorna a lista completa ordenada pelos mais recentes.
 */
export async function listAllUsers() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return { users }
}

/**
 * ALTERAR CARGO (Exclusivo Admin)
 * Esta é a única função que tem permissão para mexer no campo 'role'.
 */
export async function updateUserRole(userId: string, data: UpdateRoleInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: data.role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true, // Retorna o novo role para confirmação
    },
  })

  return { user: updatedUser }
}
