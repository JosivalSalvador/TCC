import { hash, compare } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { RegisterUserInput, UpdatePasswordInput, UpdateRoleInput, UpdateUserInput } from './users.types.js'

/**
 * CRIAR CONTA
 *
 * Executa numa transaction para garantir atomicidade:
 * se qualquer etapa falhar, nenhuma alteração persiste no banco.
 *
 * Fluxo dentro da transaction:
 * 1. Cria o User
 * 2. Faz upsert do Niche pelo nome normalizado (cria se não existir, busca se já existir)
 * 3. Cria o UserNiche — vínculo obrigatório desde o primeiro momento
 */
export async function registerUser(input: RegisterUserInput) {
  const { name, email, password, nicheName } = input

  const userExists = await prisma.user.findFirst({
    where: { email },
  })

  if (userExists) {
    throw new AppError('E-mail already exists.', StatusCodes.CONFLICT)
  }

  const passwordHash = await hash(password, 10)

  const user = await prisma.$transaction(async (tx) => {
    // 1. Cria o usuário
    const createdUser = await tx.user.create({
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

    // 2. Upsert do nicho no pool global
    // Se o nome já existir (unique), apenas retorna — senão cria.
    const niche = await tx.niche.upsert({
      where: { name: nicheName },
      update: {},
      create: { name: nicheName },
      select: { id: true },
    })

    // 3. Cria o vínculo User <-> Niche
    await tx.userNiche.create({
      data: {
        userId: createdUser.id,
        nicheId: niche.id,
      },
    })

    return createdUser
  })

  return { user }
}

/**
 * BUSCAR POR ID (Comum)
 * Filtra deletedAt: null para ignorar contas desativadas.
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
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
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  // Se estiver tentando mudar o e-mail, verifica se o novo já está em uso por conta ativa
  if (data.email && data.email !== user.email) {
    const emailExists = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
    })
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
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })

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
 * SOFT DELETE DE CONTA
 *
 * O usuário nunca é apagado fisicamente — preserva histórico e estatísticas.
 *
 * O e-mail é liberado para novo cadastro adicionando um sufixo com timestamp:
 * "user@email.com" → "user@email.com+deleted_1718500000000"
 * Isso mantém o registro histórico identificável mas libera o e-mail original.
 *
 * Os refresh tokens são apagados de fato (não soft delete) — eles não têm
 * valor de histórico, só precisam parar de funcionar imediatamente. Sem
 * isso, um token emitido antes da desativação continuaria válido em
 * outros dispositivos mesmo com a conta desativada.
 */
export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })

  if (!user) {
    throw new AppError('User not found.', StatusCodes.NOT_FOUND)
  }

  const deletedAt = new Date()
  const releasedEmail = `${user.email}+deleted_${deletedAt.getTime()}`

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt,
        email: releasedEmail,
      },
    }),
    prisma.token.deleteMany({
      where: { userId },
    }),
  ])
}

/**
 * LISTAR TODOS OS USUÁRIOS (Exclusivo Admin)
 * Retorna apenas contas ativas (deletedAt: null), ordenadas pelas mais recentes.
 */
export async function listAllUsers() {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
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
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } })

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
