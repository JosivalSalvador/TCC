import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { StatusCodes } from 'http-status-codes'
import { hash } from 'bcryptjs'
import { randomBytes, randomUUID } from 'node:crypto'
import { Role } from '@prisma/client'
import { app } from '../../../app.js'
import { prisma } from '../../../lib/prisma.js'

function generateUniqueEmail(base: string) {
  return `${base}-${randomBytes(4).toString('hex')}@example.com`
}

function generateUniqueNicheName(base: string) {
  return `${base}-${randomBytes(4).toString('hex')}`
}

// Helper local: cria um usuário, faz login via endpoint real e retorna o token pronto para uso no header Authorization.
// Mantém o E2E fiel ao fluxo real (não gera JWT manualmente).
async function createAuthenticatedUser(emailBase: string, role: Role = Role.USER) {
  const email = generateUniqueEmail(emailBase)
  const password = 'Password123!'

  const user = await prisma.user.create({
    data: {
      name: 'Niche Test User',
      email,
      password_hash: await hash(password, 6),
      role,
    },
  })

  const loginResponse = await request(app.server).post('/api/v1/sessions').send({ email, password })

  const token: string | undefined = loginResponse.body?.token

  if (!token) {
    throw new Error('Login did not return a token for the test user')
  }

  return { user, token }
}

describe('Niches Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /niches (public list)', () => {
    it('should list niches from the global pool without authentication', async () => {
      const nicheName = generateUniqueNicheName('public-pool')
      await prisma.niche.create({ data: { name: nicheName } })

      const response = await request(app.server).get('/api/v1/niches')

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('niches')
      expect(Array.isArray(response.body.niches)).toBe(true)
      expect(response.body.niches).toEqual(expect.arrayContaining([expect.objectContaining({ name: nicheName })]))
    })
  })

  describe('GET /niches/me', () => {
    it('should list niches linked to the authenticated user', async () => {
      const { user, token } = await createAuthenticatedUser('niches.me')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('linked') } })

      await prisma.userNiche.create({ data: { userId: user.id, nicheId: niche.id } })

      const response = await request(app.server).get('/api/v1/niches/me').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.niches).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: niche.id, name: niche.name })]),
      )
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/niches/me')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('POST /niches/me', () => {
    it('should link a new niche to the authenticated user and return 201', async () => {
      const { token } = await createAuthenticatedUser('niches.add')
      const nicheName = generateUniqueNicheName('cooking')

      const response = await request(app.server)
        .post('/api/v1/niches/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: nicheName })

      expect(response.statusCode).toBe(StatusCodes.CREATED)
      expect(response.body).toHaveProperty('message')
      // O schema normaliza o nome para lowercase/trim — validamos contra o valor já normalizado
      expect(response.body.niche).toEqual(expect.objectContaining({ name: nicheName.toLowerCase() }))
    })

    it('should reject linking the same niche twice (409 CONFLICT)', async () => {
      const { token } = await createAuthenticatedUser('niches.add.dup')
      const nicheName = generateUniqueNicheName('travel')

      // Primeiro vínculo — deve funcionar
      const first = await request(app.server)
        .post('/api/v1/niches/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: nicheName })
      expect(first.statusCode).toBe(StatusCodes.CREATED)

      // Segundo vínculo do mesmo nicho — deve ser bloqueado
      const second = await request(app.server)
        .post('/api/v1/niches/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: nicheName })

      expect(second.statusCode).toBe(StatusCodes.CONFLICT)
      expect(second.body).toHaveProperty('message')
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server)
        .post('/api/v1/niches/me')
        .send({ name: generateUniqueNicheName('no-auth') })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('DELETE /niches/me/:id', () => {
    it('should unlink a niche and return 204 when user has more than one niche', async () => {
      const { user, token } = await createAuthenticatedUser('niches.remove')
      const nicheA = await prisma.niche.create({ data: { name: generateUniqueNicheName('music') } })
      const nicheB = await prisma.niche.create({ data: { name: generateUniqueNicheName('sports') } })

      await prisma.userNiche.create({ data: { userId: user.id, nicheId: nicheA.id } })
      await prisma.userNiche.create({ data: { userId: user.id, nicheId: nicheB.id } })

      const response = await request(app.server)
        .delete(`/api/v1/niches/me/${nicheA.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT)

      const link = await prisma.userNiche.findUnique({
        where: { userId_nicheId: { userId: user.id, nicheId: nicheA.id } },
      })
      expect(link).toBeNull()
    })

    it('should reject with 422 when trying to remove the last niche of the user', async () => {
      const { user, token } = await createAuthenticatedUser('niches.remove.last')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('lastone') } })

      await prisma.userNiche.create({ data: { userId: user.id, nicheId: niche.id } })

      const response = await request(app.server)
        .delete(`/api/v1/niches/me/${niche.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.UNPROCESSABLE_ENTITY)
      expect(response.body).toHaveProperty('message')
    })

    it('should reject with 404 when the niche is not linked to the user', async () => {
      const { token } = await createAuthenticatedUser('niches.remove.notlinked')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('unlinked') } })

      const response = await request(app.server)
        .delete(`/api/v1/niches/me/${niche.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).delete(`/api/v1/niches/me/${randomUUID()}`)

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /niches/stats (Admin only)', () => {
    it('should return stats for an admin user', async () => {
      const { token } = await createAuthenticatedUser('niches.stats.admin', Role.ADMIN)
      await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-check') } })

      const response = await request(app.server).get('/api/v1/niches/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('monthlyGrowth')
      expect(Array.isArray(response.body.monthlyGrowth)).toBe(true)
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('niches.stats.user', Role.USER)

      const response = await request(app.server).get('/api/v1/niches/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
      expect(response.body.message).toMatch(/insufficient privileges/i)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/niches/stats')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })
})
