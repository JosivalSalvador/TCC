import { StatusCodes } from 'http-status-codes'
import { TokenType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../errors/app-error.js'
import { TOKEN_TTL_CONFIG } from './tokens.types.js' // ← ATUALIZADO: Importando do novo arquivo

/**
 * Renova o par de tokens (Access + Refresh)
 * Implementa Rotação de Token: O antigo é invalidado imediatamente.
 */
export async function refreshUserToken(refreshTokenId: string) {
  // 1. Busca o token no banco (e traz o usuário dono dele)
  const token = await prisma.token.findUnique({
    where: { id: refreshTokenId },
    include: { user: true },
  })

  // 2. Se não existir, erro imediato
  if (!token) {
    throw new AppError('Refresh token not found or expired.', StatusCodes.UNAUTHORIZED)
  }

  // 3. Garante que o token é do tipo correto
  if (token.type !== TokenType.REFRESH_TOKEN) {
    throw new AppError('Invalid token type.', StatusCodes.UNAUTHORIZED)
  }

  // 4. Verifica expiração
  if (token.expiresAt && token.expiresAt < new Date()) {
    await prisma.token.delete({ where: { id: refreshTokenId } })
    throw new AppError('Refresh token expired.', StatusCodes.UNAUTHORIZED)
  }

  // 5. ROTAÇÃO DE TOKEN ATÔMICA (delete + create)
  const newRefreshToken = await prisma.$transaction(async (tx) => {
    await tx.token.delete({
      where: { id: refreshTokenId },
    })

    // ← ALTERADO: Usando a função utilitária do nosso types para pegar a data pronta
    const expirationDate = TOKEN_TTL_CONFIG[TokenType.REFRESH_TOKEN].getExpirationDate()

    return tx.token.create({
      data: {
        type: TokenType.REFRESH_TOKEN,
        userId: token.userId,
        expiresAt: expirationDate,
      },
    })
  })

  // 6. Retorna o novo par
  return {
    refreshToken: newRefreshToken.id,
    user: {
      id: token.user.id,
      role: token.user.role,
    },
  }
}
