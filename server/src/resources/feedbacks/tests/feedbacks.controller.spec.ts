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

const VALID_PASSWORD = 'Password123!'

// Helper local: cria um usuário direto no banco e faz login via endpoint real,
// retornando o token pronto para uso no header Authorization.
async function createAuthenticatedUser(emailBase: string, role: Role = Role.USER) {
  const email = generateUniqueEmail(emailBase)

  const user = await prisma.user.create({
    data: {
      name: 'Feedbacks Controller Test User',
      email,
      password_hash: await hash(VALID_PASSWORD, 6),
      role,
    },
  })

  const loginResponse = await request(app.server).post('/api/v1/sessions').send({ email, password: VALID_PASSWORD })

  const token: string | undefined = loginResponse.body?.token

  if (!token) {
    throw new Error('Login did not return a token for the test user')
  }

  return { user, token }
}

// Helper local: cria uma Generation completa direto no banco, já que o módulo
// de generations ainda não foi testado aqui — feedbacks só precisa que ela exista.
async function createTestGeneration(userId: string, nicheId: string) {
  return prisma.generation.create({
    data: {
      userId,
      nicheId,
      nicheRequested: 'test-niche-requested',
      structureContent: { sections: ['intro', 'body', 'outro'] },
      scriptContent: { lines: ['line 1', 'line 2'] },
    },
  })
}

describe('Feedbacks Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /generations/:id/feedback', () => {
    it('should create a new feedback and return 200', async () => {
      const { user, token } = await createAuthenticatedUser('feedback.create')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('ctrl-create') } })
      const generation = await createTestGeneration(user.id, niche.id)

      const response = await request(app.server)
        .post(`/api/v1/generations/${generation.id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'STRUCTURE', isUseful: true })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('message')
      expect(response.body.feedback).toEqual(
        expect.objectContaining({
          generationId: generation.id,
          type: 'STRUCTURE',
          isUseful: true,
        }),
      )
    })

    it('should update an existing feedback instead of duplicating it (upsert)', async () => {
      const { user, token } = await createAuthenticatedUser('feedback.update')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('ctrl-update') } })
      const generation = await createTestGeneration(user.id, niche.id)

      const first = await request(app.server)
        .post(`/api/v1/generations/${generation.id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'SCRIPT', isUseful: false })
      expect(first.statusCode).toBe(StatusCodes.OK)

      const second = await request(app.server)
        .post(`/api/v1/generations/${generation.id}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'SCRIPT', isUseful: true })

      expect(second.statusCode).toBe(StatusCodes.OK)
      expect(second.body.feedback.isUseful).toBe(true)

      const count = await prisma.generationFeedback.count({
        where: { generationId: generation.id, type: 'SCRIPT' },
      })
      expect(count).toEqual(1)
    })

    it('should reject with 404 when the generation does not exist', async () => {
      const { token } = await createAuthenticatedUser('feedback.nogen')

      const response = await request(app.server)
        .post(`/api/v1/generations/${randomUUID()}/feedback`)
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'STRUCTURE', isUseful: true })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(response.body).toHaveProperty('message')
    })

    it('should reject with 404 when the generation belongs to a different user', async () => {
      const { user: owner } = await createAuthenticatedUser('feedback.owner')
      const { token: intruderToken } = await createAuthenticatedUser('feedback.intruder')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('ctrl-intruder') } })
      const generation = await createTestGeneration(owner.id, niche.id)

      const response = await request(app.server)
        .post(`/api/v1/generations/${generation.id}/feedback`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({ type: 'STRUCTURE', isUseful: true })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server)
        .post(`/api/v1/generations/${randomUUID()}/feedback`)
        .send({ type: 'STRUCTURE', isUseful: true })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /feedbacks/stats (Admin only)', () => {
    it('should return stats for an admin user', async () => {
      const { token } = await createAuthenticatedUser('stats.admin', Role.ADMIN)

      const response = await request(app.server).get('/api/v1/feedbacks/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('byType')
      expect(response.body).toHaveProperty('byNiche')
      expect(Array.isArray(response.body.byType)).toBe(true)
      expect(Array.isArray(response.body.byNiche)).toBe(true)
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('stats.user', Role.USER)

      const response = await request(app.server).get('/api/v1/feedbacks/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/feedbacks/stats')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })
})
