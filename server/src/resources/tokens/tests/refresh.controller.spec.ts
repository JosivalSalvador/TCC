import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { hash } from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { app } from '../../../app.js'
import { prisma } from '../../../lib/prisma.js'

function generateUniqueEmail(base: string) {
  return `${base}-${randomBytes(4).toString('hex')}@example.com`
}

describe('Refresh Token Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('PATCH /api/v1/token/refresh', () => {
    it('should be able to refresh token using cookie (and rotate it)', async () => {
      const email = generateUniqueEmail('refresh.ok')
      const password = 'Password123!'

      await prisma.user.create({
        data: {
          name: 'John Doe',
          email,
          password_hash: await hash(password, 6),
        },
      })

      const agent = request.agent(app.server)

      // 1. Login para obter o cookie assinado
      const loginResponse = await agent.post('/api/v1/sessions').send({ email, password })
      expect(loginResponse.statusCode).toBe(StatusCodes.OK)

      const loginCookies = loginResponse.headers['set-cookie']
      if (!loginCookies) {
        throw new Error('O cookie refreshToken não foi retornado no login')
      }

      // 2. Refresh utilizando o cookie do agent
      const refreshResponse = await agent.patch('/api/v1/token/refresh').send()

      expect(refreshResponse.statusCode).toBe(StatusCodes.OK)

      // Valida o schema de sucesso retornado (tokenResponseSchema)
      expect(refreshResponse.body).toHaveProperty('token')
      expect(typeof refreshResponse.body.token).toBe('string')

      const refreshCookies = refreshResponse.headers['set-cookie']
      if (!refreshCookies) {
        throw new Error('O cookie refreshToken não foi rotacionado/retornado no header')
      }

      expect(refreshCookies[0]).toContain('refreshToken=')

      // Verifica se houve rotação (cookie novo diferente do antigo)
      expect(refreshCookies[0]).not.toEqual(loginCookies[0])
    })

    it('should set Secure cookie when in production mode', async () => {
      const email = generateUniqueEmail('refresh.secure')
      const password = 'Password123!'

      await prisma.user.create({
        data: {
          name: 'John Secure',
          email,
          password_hash: await hash(password, 6),
        },
      })

      const agent = request.agent(app.server)

      // Realiza o login em ambiente normal
      const loginResponse = await agent.post('/api/v1/sessions').send({ email, password })
      expect(loginResponse.statusCode).toBe(StatusCodes.OK)

      // Simula produção apenas para checar o header do cookie
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const refreshResponse = await agent.patch('/api/v1/token/refresh').send()
      const refreshCookies = refreshResponse.headers['set-cookie']

      // Restauramos antes das asserções para evitar efeitos colaterais nos outros testes
      process.env.NODE_ENV = originalEnv

      if (!refreshCookies) {
        throw new Error('O cookie refreshToken não foi retornado em produção')
      }

      // Verificamos se o atributo Secure foi enviado no header
      expect(refreshCookies[0]).toContain('Secure')
    })

    it('should not be able to refresh without cookie', async () => {
      // Usamos o request direto (sem agent) para garantir que não há cookies
      const response = await request(app.server).patch('/api/v1/token/refresh').send()

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      // Valida o schema de erro (tokenErrorSchema)
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toMatch(/missing/i)
    })

    it('should not be able to refresh with invalid/fake cookie', async () => {
      const response = await request(app.server)
        .patch('/api/v1/token/refresh')
        .set('Cookie', ['refreshToken=s:invalid.signature']) // Formato de cookie assinado inválido
        .send()

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      expect(response.body).toHaveProperty('message')
    })
  })
})
