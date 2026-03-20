import { describe, it, expect } from 'vitest'
import { TokenType } from '@prisma/client'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../../../lib/prisma.js'
import { refreshUserToken } from '../refresh.service.js'
import { AppError } from '../../../errors/app-error.js' // ← ADICIONADO: Para checagem estrita de erro

function generateUniqueEmail(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}@test.com`
}

describe('Refresh Token Service (Integration)', () => {
  describe('refreshUserToken', () => {
    it('should refresh token with rotation and return correct payload', async () => {
      const uniqueEmail = generateUniqueEmail('john.refresh')
      const user = await prisma.user.create({
        data: {
          name: 'John Refresh',
          email: uniqueEmail,
          password_hash: 'hash',
        },
      })

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 10)

      const oldToken = await prisma.token.create({
        data: {
          type: TokenType.REFRESH_TOKEN,
          userId: user.id,
          expiresAt: futureDate,
        },
      })

      const result = await refreshUserToken(oldToken.id)

      // ← ADICIONADO: Garantindo que o mapeamento pro JWT está intacto
      expect(result.user.id).toEqual(user.id)
      expect(result.user.role).toEqual(user.role)
      expect(result.refreshToken).not.toEqual(oldToken.id)

      // Verifica se o token antigo sumiu (Rotação Atômica)
      const oldTokenCheck = await prisma.token.findUnique({
        where: { id: oldToken.id },
      })
      expect(oldTokenCheck).toBeNull()

      // Verifica se o novo token foi criado corretamente
      const newTokenCheck = await prisma.token.findUnique({
        where: { id: result.refreshToken },
      })

      expect(newTokenCheck).not.toBeNull()
      expect(newTokenCheck?.userId).toEqual(user.id)
      expect(newTokenCheck?.type).toEqual(TokenType.REFRESH_TOKEN)
      // Garante que a data de expiração foi jogada pro futuro baseado no config
      expect(newTokenCheck?.expiresAt?.getTime()).toBeGreaterThan(Date.now())
    })

    it('should fail if token does not exist', async () => {
      // ← ATUALIZADO: Verificando a instância exata do nosso erro customizado
      await expect(refreshUserToken(randomUUID())).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if token expired and delete the expired token', async () => {
      const uniqueEmail = generateUniqueEmail('john.expired')
      const user = await prisma.user.create({
        data: {
          name: 'John Expired',
          email: uniqueEmail,
          password_hash: 'hash',
        },
      })

      const expiredDate = new Date()
      expiredDate.setDate(expiredDate.getDate() - 1) // Ontem

      const expiredToken = await prisma.token.create({
        data: {
          type: TokenType.REFRESH_TOKEN,
          userId: user.id,
          expiresAt: expiredDate,
        },
      })

      // Verifica se rejeitou com a nossa classe de erro
      await expect(refreshUserToken(expiredToken.id)).rejects.toBeInstanceOf(AppError)

      // ← ADICIONADO: Valida se a regra de negócio do Service (limpar token expirado) executou
      const tokenCheck = await prisma.token.findUnique({
        where: { id: expiredToken.id },
      })
      expect(tokenCheck).toBeNull()
    })
  })
})
