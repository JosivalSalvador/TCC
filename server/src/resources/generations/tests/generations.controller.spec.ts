import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest'
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
      name: 'Generations Controller Test User',
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

// Helper local: cria um nicho e já vincula ao usuário (createGeneration exige o vínculo).
async function createLinkedNiche(userId: string, nameBase: string) {
  const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName(nameBase) } })
  await prisma.userNiche.create({ data: { userId, nicheId: niche.id } })
  return niche
}

// Helper local: cria uma Generation completa direto no banco, para as rotas que não
// envolvem o fluxo de IA (listagem, busca, favorito, stats).
async function createTestGeneration(userId: string, nicheId: string, overrides: { isFavorite?: boolean } = {}) {
  return prisma.generation.create({
    data: {
      userId,
      nicheId,
      nicheRequested: 'test-niche-requested',
      structureContent: { sections: ['intro', 'body', 'outro'] },
      scriptContent: { lines: ['line 1', 'line 2'] },
      ...(overrides.isFavorite !== undefined && { isFavorite: overrides.isFavorite }),
    },
  })
}

function fakeResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response
}

describe('Generations Controller (E2E)', () => {
  const ORIGINAL_ENV = process.env.IA_SERVICE_URL

  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    process.env.IA_SERVICE_URL = ORIGINAL_ENV
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /generations', () => {
    it('should create a generation and return 201 when the IA service responds successfully', async () => {
      process.env.IA_SERVICE_URL = 'http://ia-service.test'

      const { user, token } = await createAuthenticatedUser('create.success')
      const niche = await createLinkedNiche(user.id, 'ctrl-create-success')

      vi.spyOn(global, 'fetch').mockResolvedValue(
        fakeResponse(200, {
          nicho_solicitado: niche.name,
          nicho_utilizado: niche.name,
          fallback_usado: false,
          structure_content: { sections: ['a'] },
          script_content: { lines: ['b'] },
        }),
      )

      const response = await request(app.server)
        .post('/api/v1/generations')
        .set('Authorization', `Bearer ${token}`)
        .send({ nicheId: niche.id })

      expect(response.statusCode).toBe(StatusCodes.CREATED)
      expect(response.body).toHaveProperty('message')
      expect(response.body.generation).toEqual(expect.objectContaining({ nicheId: niche.id }))
    })

    it('should reject with 404 when the niche is not linked to the user', async () => {
      process.env.IA_SERVICE_URL = 'http://ia-service.test'

      const { token } = await createAuthenticatedUser('create.notlinked')
      const fetchSpy = vi.spyOn(global, 'fetch')

      const response = await request(app.server)
        .post('/api/v1/generations')
        .set('Authorization', `Bearer ${token}`)
        .send({ nicheId: randomUUID() })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).post('/api/v1/generations').send({ nicheId: randomUUID() })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /generations', () => {
    it('should list generations for the authenticated user', async () => {
      const { user, token } = await createAuthenticatedUser('list.all')
      const niche = await createLinkedNiche(user.id, 'ctrl-list-all')
      const generation = await createTestGeneration(user.id, niche.id)

      const response = await request(app.server).get('/api/v1/generations').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.generations).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: generation.id })]),
      )
    })

    it('should filter by favorite=true via query string', async () => {
      const { user, token } = await createAuthenticatedUser('list.favtrue')
      const niche = await createLinkedNiche(user.id, 'ctrl-list-favtrue')

      const favorite = await createTestGeneration(user.id, niche.id, { isFavorite: true })
      const notFavorite = await createTestGeneration(user.id, niche.id, { isFavorite: false })

      const response = await request(app.server)
        .get('/api/v1/generations')
        .query({ favorite: 'true' })
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      const ids = response.body.generations.map((g: { id: string }) => g.id)
      expect(ids).toContain(favorite.id)
      expect(ids).not.toContain(notFavorite.id)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/generations')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /generations/stats (Admin only)', () => {
    it('should return stats for an admin user', async () => {
      const { token } = await createAuthenticatedUser('stats.admin', Role.ADMIN)

      const response = await request(app.server)
        .get('/api/v1/generations/stats')
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('totalGenerations')
      expect(response.body).toHaveProperty('byNiche')
      expect(Array.isArray(response.body.byNiche)).toBe(true)
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('stats.user', Role.USER)

      const response = await request(app.server)
        .get('/api/v1/generations/stats')
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/generations/stats')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /generations/:id', () => {
    it('should return a specific generation belonging to the user', async () => {
      const { user, token } = await createAuthenticatedUser('getone.success')
      const niche = await createLinkedNiche(user.id, 'ctrl-getone-success')
      const generation = await createTestGeneration(user.id, niche.id)

      const response = await request(app.server)
        .get(`/api/v1/generations/${generation.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.generation).toEqual(expect.objectContaining({ id: generation.id }))
    })

    it('should reject with 404 when the generation does not exist', async () => {
      const { token } = await createAuthenticatedUser('getone.notfound')

      const response = await request(app.server)
        .get(`/api/v1/generations/${randomUUID()}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should reject with 404 when the generation belongs to a different user', async () => {
      const { user: owner } = await createAuthenticatedUser('getone.owner')
      const { token: intruderToken } = await createAuthenticatedUser('getone.intruder')
      const niche = await createLinkedNiche(owner.id, 'ctrl-getone-owner')
      const generation = await createTestGeneration(owner.id, niche.id)

      const response = await request(app.server)
        .get(`/api/v1/generations/${generation.id}`)
        .set('Authorization', `Bearer ${intruderToken}`)

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get(`/api/v1/generations/${randomUUID()}`)

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('PATCH /generations/:id/favorite', () => {
    it('should update the favorite status and return 200', async () => {
      const { user, token } = await createAuthenticatedUser('favorite.success')
      const niche = await createLinkedNiche(user.id, 'ctrl-favorite-success')
      const generation = await createTestGeneration(user.id, niche.id, { isFavorite: false })

      const response = await request(app.server)
        .patch(`/api/v1/generations/${generation.id}/favorite`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isFavorite: true })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.generation.isFavorite).toBe(true)

      const updated = await prisma.generation.findUnique({ where: { id: generation.id } })
      expect(updated?.isFavorite).toBe(true)
    })

    it('should reject with 404 when the generation belongs to a different user', async () => {
      const { user: owner } = await createAuthenticatedUser('favorite.owner')
      const { token: intruderToken } = await createAuthenticatedUser('favorite.intruder')
      const niche = await createLinkedNiche(owner.id, 'ctrl-favorite-owner')
      const generation = await createTestGeneration(owner.id, niche.id)

      const response = await request(app.server)
        .patch(`/api/v1/generations/${generation.id}/favorite`)
        .set('Authorization', `Bearer ${intruderToken}`)
        .send({ isFavorite: true })

      expect(response.statusCode).toBe(StatusCodes.NOT_FOUND)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server)
        .patch(`/api/v1/generations/${randomUUID()}/favorite`)
        .send({ isFavorite: true })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })
})
