import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { randomBytes } from 'node:crypto'
import { Role } from '@prisma/client' // ← ADICIONADO: Importando o Enum oficial
import { app } from '../../../app.js'
import { prisma } from '../../../lib/prisma.js'

/** * Auxiliar para garantir unicidade nos testes e evitar colisões
 */
const generateUniqueEmail = (base: string) => `${base}-${randomBytes(4).toString('hex')}@example.com`

/**
 * Interface para o retorno do helper de autenticação
 */
interface AuthSession {
  token: string
  userId: string
  email: string
}

// ← ATUALIZADO: Usando o Enum do Prisma como tipo do argumento
async function createAndAuthenticateUser(role: Role = Role.USER): Promise<AuthSession> {
  const email = generateUniqueEmail('test')
  const password = 'Password123!'

  // Registro
  const registerResponse = await request(app.server).post('/api/v1/users').send({
    name: 'Test User',
    email,
    password,
  })

  const userId = registerResponse.body.userId

  // Atualiza no banco caso precisemos de um perfil superior (ADMIN, SUPPORTER)
  if (role !== Role.USER) {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
    })
  }

  // Login
  const authResponse = await request(app.server).post('/api/v1/sessions').send({
    email,
    password,
  })

  return {
    token: authResponse.body.token,
    userId,
    email,
  }
}

describe('Users Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Autogestão (/me)', () => {
    it('should be able to get profile', async () => {
      const { token, userId, email } = await createAndAuthenticateUser()

      const response = await request(app.server).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)

      // ← ADICIONADO: Validação completa do payload mapeado pelo Zod
      expect(response.body.user).toBeDefined()
      expect(response.body.user.id).toBe(userId)
      expect(response.body.user.email).toBe(email)
      expect(response.body.user.role).toBe(Role.USER)
    })

    it('should be able to delete account and clear cookies', async () => {
      const { token } = await createAndAuthenticateUser()

      const response = await request(app.server).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT)

      const cookies = response.headers['set-cookie']

      // ← ATUALIZADO: Se o cookie não vier, falhamos o teste de forma ruidosa (Strict Mode)
      if (!cookies) {
        throw new Error('O header set-cookie com refreshToken não foi retornado na deleção')
      }

      expect(cookies[0]).toContain('refreshToken=;')
    })
  })

  describe('Administração (/users)', () => {
    it('should return 403 when non-admin tries to list users', async () => {
      // ← ATUALIZADO: Usando Enum
      const { token } = await createAndAuthenticateUser(Role.USER)

      const response = await request(app.server).get('/api/v1/users').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should return 200 when admin lists users', async () => {
      // ← ATUALIZADO: Usando Enum
      const { token } = await createAndAuthenticateUser(Role.ADMIN)

      const response = await request(app.server).get('/api/v1/users').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(Array.isArray(response.body.users)).toBe(true)

      // Garante que o retorno é no formato do Zod userResponseSchema
      if (response.body.users.length > 0) {
        const firstUser = response.body.users[0]
        expect(firstUser).toHaveProperty('id')
        expect(firstUser).toHaveProperty('name')
        expect(firstUser).toHaveProperty('email')
        expect(firstUser).toHaveProperty('role')
      }
    })

    it('should allow admin to change a user role', async () => {
      const admin = await createAndAuthenticateUser(Role.ADMIN)
      const targetUser = await createAndAuthenticateUser(Role.USER)

      const response = await request(app.server)
        .patch(`/api/v1/users/${targetUser.userId}/role`)
        .set('Authorization', `Bearer ${admin.token}`)
        // ← ATUALIZADO: Enviando a role via Enum para bater certinho no Zod
        .send({ role: Role.SUPPORTER })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.user).toBeDefined()
      expect(response.body.user.role).toBe(Role.SUPPORTER)
    })
  })
})
