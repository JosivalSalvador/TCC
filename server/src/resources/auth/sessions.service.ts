import { compare } from 'bcryptjs'
import { StatusCodes } from 'http-status-codes'
import { TokenType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import type { LoginInput } from './sessions.types.js'
import { TOKEN_TTL_CONFIG } from '../tokens/tokens.types.js'

/**
 * Autentica um usuário existente e gera Refresh Token
 */
export async function authenticateUser(input: LoginInput) {
  const { email, password } = input

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new AppError('Invalid credentials.', StatusCodes.UNAUTHORIZED)
  }

  const doesPasswordMatch = await compare(password, user.password_hash)

  if (!doesPasswordMatch) {
    throw new AppError('Invalid credentials.', StatusCodes.UNAUTHORIZED)
  }

  const expirationDate = TOKEN_TTL_CONFIG[TokenType.REFRESH_TOKEN].getExpirationDate()

  const refreshToken = await prisma.token.create({
    data: {
      type: TokenType.REFRESH_TOKEN,
      userId: user.id,
      expiresAt: expirationDate,
    },
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role, // O Prisma já garante que isso é o Enum correto
    },
    refreshToken: refreshToken.id,
  }
}

/**
 * Remove a sessão (Logout)
 * Recebe o UUID puro vindo do unsignCookie do controller
 */
export async function signOut(refreshTokenId: string) {
  // Código nível sênior: deleteMany não quebra se o ID não existir.
  // Ele retorna { count: 0 }, garantindo idempotência absoluta sem overhead de try/catch.
  await prisma.token.deleteMany({
    where: {
      id: refreshTokenId,
    },
  })
}
