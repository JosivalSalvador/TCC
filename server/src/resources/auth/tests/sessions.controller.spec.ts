import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { hash } from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { Role } from '@prisma/client' // ← ADICIONADO: Importando o Enum oficial
import { app } from '../../../app.js'
import { prisma } from '../../../lib/prisma.js'

function generateUniqueEmail(base: string) {
  return `${base}-${randomBytes(4).toString('hex')}@example.com`
}

describe('Sessions Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/v1/sessions (Login)', () => {
    it('should be able to authenticate and return token and user data', async () => {
      const email = generateUniqueEmail('login.test')
      const password = 'Password123!'

      await prisma.user.create({
        data: {
          name: 'Login User',
          email,
          password_hash: await hash(password, 6),
          role: Role.USER, // ← ATUALIZADO: Usando o Enum
        },
      })

      const response = await request(app.server).post('/api/v1/sessions').send({ email, password })

      // Valida o status e o schema da resposta mapeado no Router via Zod
      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('token')
      expect(response.body.user).toEqual(
        expect.objectContaining({
          name: 'Login User',
          email,
          role: Role.USER, // ← ATUALIZADO: Usando o Enum
        }),
      )

      // Valida se o cookie assinado do refreshToken foi injetado
      const cookies = response.headers['set-cookie']
      // ← ATUALIZADO: Trava dura do TypeScript
      if (!cookies) {
        throw new Error('O cookie refreshToken não foi retornado no header')
      }
      expect(cookies[0]).toContain('refreshToken=')
      expect(cookies[0]).toContain('HttpOnly')
    })

    it('should reject invalid credentials with 401', async () => {
      const email = generateUniqueEmail('invalid.login')

      await prisma.user.create({
        data: {
          name: 'Invalid User',
          email,
          password_hash: await hash('ValidPassword123!', 6),
        },
      })

      const response = await request(app.server).post('/api/v1/sessions').send({ email, password: 'WrongPassword!' })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      expect(response.body.message).toBeDefined()
    })
  })

  describe('POST /api/v1/sessions/logout (Logout)', () => {
    it('should clear refreshToken cookie and delete token from database', async () => {
      const email = generateUniqueEmail('logout.test')
      const password = 'Password123!'

      // 1. Criar usuário para o teste
      const user = await prisma.user.create({
        data: {
          name: 'Logout User',
          email,
          password_hash: await hash(password, 6),
        },
      })

      // O agent retém os cookies (como o refreshToken) para requisições futuras
      const agent = request.agent(app.server)

      // 2. Realizar Login para preencher o Cookie
      const loginResponse = await agent.post('/api/v1/sessions').send({ email, password })

      expect(loginResponse.statusCode).toBe(StatusCodes.OK)

      // 3. Buscar o token gerado para validar o ID
      const tokenBefore = await prisma.token.findFirst({
        where: { userId: user.id },
      })

      // Validação de segurança para o TypeScript:
      // Se não houver token, o teste falha aqui e não tenta acessar .id
      if (!tokenBefore) {
        throw new Error('Token was not created in database during login')
      }

      // Agora o TS sabe que tokenId é obrigatoriamente uma string
      const tokenId: string = tokenBefore.id

      // 4. Executar Logout (o agent envia o cookie automaticamente)
      const logoutResponse = await agent.post('/api/v1/sessions/logout')

      // Asserções
      expect(logoutResponse.statusCode).toBe(StatusCodes.NO_CONTENT)

      // Verifica se a instrução de expirar o cookie foi enviada
      const cookiesHeader = logoutResponse.headers['set-cookie']
      // ← ATUALIZADO: Checagem estrita para arrancar o ?.[0]
      if (!cookiesHeader) {
        throw new Error('O header set-cookie para limpar o token não foi retornado')
      }
      expect(cookiesHeader[0]).toContain('refreshToken=;')

      // 5. Verificar se o token sumiu do banco de dados de fato
      const tokenAfter = await prisma.token.findUnique({
        where: { id: tokenId },
      })

      expect(tokenAfter).toBeNull()
    })

    it('should return NO_CONTENT even if cookie is missing (idempotency)', async () => {
      // Testa se o sistema aguenta um logout "vazio" sem dar erro 500
      const response = await request(app.server).post('/api/v1/sessions/logout')

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT)
    })
  })
})
