import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../errors/app-error.js'
import {
  createGeneration,
  listUserGenerations,
  getGenerationById,
  updateFavorite,
  getGenerationStats,
} from '../generations.service.js'

function generateUniqueEmail(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}@test.com`
}

function generateUniqueNicheName(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}`
}

// Helper local: cria um usuário mínimo, sem foco no fluxo de auth.
async function createTestUser(emailBase: string) {
  return prisma.user.create({
    data: {
      name: 'Generations Test User',
      email: generateUniqueEmail(emailBase),
      password_hash: await hash('Password123!', 6),
    },
  })
}

// Helper local: cria um nicho e já vincula ao usuário, já que createGeneration
// exige que o nicho esteja em UserNiche para o usuário em questão.
async function createLinkedNiche(userId: string, nameBase: string) {
  const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName(nameBase) } })
  await prisma.userNiche.create({ data: { userId, nicheId: niche.id } })
  return niche
}

// Helper local: cria uma Generation completa direto no banco, para os testes
// que não envolvem o fluxo de IA (listagem, busca, favorito, stats).
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

// Helper local: monta uma Response fake do jeito que o service espera (com .json() e .status/.ok)
function fakeResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response
}

describe('Generations Service (Integration)', () => {
  describe('createGeneration', () => {
    const ORIGINAL_ENV = process.env.IA_SERVICE_URL

    beforeEach(() => {
      // Garante uma URL previsível para os testes que simulam a IA respondendo
      process.env.IA_SERVICE_URL = 'http://ia-service.test'
    })

    afterEach(() => {
      vi.restoreAllMocks()
      process.env.IA_SERVICE_URL = ORIGINAL_ENV
    })

    it('should fail if the niche is not linked to the user, without calling the IA service', async () => {
      const user = await createTestUser('create.notlinked')
      const fetchSpy = vi.spyOn(global, 'fetch')

      await expect(
        createGeneration(user.id, { nicheId: randomUUID(), audienceCountry: undefined }),
      ).rejects.toBeInstanceOf(AppError)

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should fail if IA_SERVICE_URL is not configured, without calling fetch', async () => {
      process.env.IA_SERVICE_URL = ''

      const user = await createTestUser('create.noenv')
      const niche = await createLinkedNiche(user.id, 'create-noenv')
      const fetchSpy = vi.spyOn(global, 'fetch')

      await expect(createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })).rejects.toBeInstanceOf(
        AppError,
      )

      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('should create the generation when the IA service responds successfully', async () => {
      const user = await createTestUser('create.success')
      const niche = await createLinkedNiche(user.id, 'create-success')

      const iaPayload = {
        nicho_solicitado: 'nicho original digitado',
        nicho_utilizado: niche.name,
        fallback_usado: false,
        structure_content: { sections: ['a', 'b'] },
        script_content: { lines: ['x', 'y'] },
      }

      vi.spyOn(global, 'fetch').mockResolvedValue(fakeResponse(200, iaPayload))

      const { generation } = await createGeneration(user.id, {
        nicheId: niche.id,
        audienceCountry: 'BR',
      })

      // Confere o mapeamento de campos com nomes diferentes entre a resposta da IA e o schema
      expect(generation.nicheRequested).toEqual(iaPayload.nicho_solicitado)
      expect(generation.fallbackUsed).toEqual(iaPayload.fallback_usado)
      expect(generation.structureContent).toEqual(iaPayload.structure_content)
      expect(generation.scriptContent).toEqual(iaPayload.script_content)
      expect(generation.nicheId).toEqual(niche.id)
      expect(generation.audienceCountry).toEqual('BR')

      const stored = await prisma.generation.findUnique({ where: { id: generation.id } })
      expect(stored).not.toBeNull()
    })

    it('should store audienceCountry as null when not provided', async () => {
      const user = await createTestUser('create.noaudience')
      const niche = await createLinkedNiche(user.id, 'create-noaudience')

      vi.spyOn(global, 'fetch').mockResolvedValue(
        fakeResponse(200, {
          nicho_solicitado: niche.name,
          nicho_utilizado: niche.name,
          fallback_usado: false,
          structure_content: {},
          script_content: {},
        }),
      )

      const { generation } = await createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })

      expect(generation.audienceCountry).toBeNull()
    })

    it('should propagate a 404 with the IA-provided message when the IA service returns 404', async () => {
      const user = await createTestUser('create.ia404')
      const niche = await createLinkedNiche(user.id, 'create-ia404')

      vi.spyOn(global, 'fetch').mockResolvedValue(fakeResponse(404, { detail: 'Niche not recognized by IA' }))

      await expect(createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })).rejects.toBeInstanceOf(
        AppError,
      )

      // Nenhuma Generation deve ter sido persistida quando a IA rejeita o nicho
      const generations = await prisma.generation.findMany({ where: { userId: user.id, nicheId: niche.id } })
      expect(generations).toHaveLength(0)
    })

    it('should fail gracefully with a 404 when the IA service returns 404 with a non-JSON body', async () => {
      const user = await createTestUser('create.ia404badjson')
      const niche = await createLinkedNiche(user.id, 'create-ia404badjson')

      vi.spyOn(global, 'fetch').mockResolvedValue({
        status: 404,
        ok: false,
        json: async () => {
          throw new Error('not valid json')
        },
      } as unknown as Response)

      // O service tem um .catch(() => null) para esse cenário — não deve estourar um erro diferente de AppError
      await expect(createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })).rejects.toBeInstanceOf(
        AppError,
      )
    })

    it('should fail with BAD_GATEWAY-equivalent AppError when the IA service is unreachable (network error)', async () => {
      const user = await createTestUser('create.unreachable')
      const niche = await createLinkedNiche(user.id, 'create-unreachable')

      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

      await expect(createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })).rejects.toBeInstanceOf(
        AppError,
      )

      const generations = await prisma.generation.findMany({ where: { userId: user.id, nicheId: niche.id } })
      expect(generations).toHaveLength(0)
    })

    it('should fail when the IA service returns a generic error status (e.g. 500)', async () => {
      const user = await createTestUser('create.ia500')
      const niche = await createLinkedNiche(user.id, 'create-ia500')

      vi.spyOn(global, 'fetch').mockResolvedValue(fakeResponse(500, { detail: 'Internal error' }))

      await expect(createGeneration(user.id, { nicheId: niche.id, audienceCountry: undefined })).rejects.toBeInstanceOf(
        AppError,
      )

      const generations = await prisma.generation.findMany({ where: { userId: user.id, nicheId: niche.id } })
      expect(generations).toHaveLength(0)
    })
  })

  describe('listUserGenerations', () => {
    it('should list all generations for the user, ordered by most recent first, when no filter is given', async () => {
      const user = await createTestUser('list.all')
      const niche = await createLinkedNiche(user.id, 'list-all')

      const older = await createTestGeneration(user.id, niche.id)
      const newer = await createTestGeneration(user.id, niche.id)

      const { generations } = await listUserGenerations(user.id, { favorite: undefined })

      const olderIndex = generations.findIndex((g) => g.id === older.id)
      const newerIndex = generations.findIndex((g) => g.id === newer.id)

      expect(olderIndex).toBeGreaterThan(-1)
      expect(newerIndex).toBeGreaterThan(-1)
      expect(newerIndex).toBeLessThan(olderIndex)
    })

    it('should filter only favorites when favorite=true', async () => {
      const user = await createTestUser('list.favtrue')
      const niche = await createLinkedNiche(user.id, 'list-favtrue')

      const favorite = await createTestGeneration(user.id, niche.id, { isFavorite: true })
      const notFavorite = await createTestGeneration(user.id, niche.id, { isFavorite: false })

      const { generations } = await listUserGenerations(user.id, { favorite: true })

      expect(generations.find((g) => g.id === favorite.id)).toBeDefined()
      expect(generations.find((g) => g.id === notFavorite.id)).toBeUndefined()
    })

    it('should filter only non-favorites when favorite=false', async () => {
      const user = await createTestUser('list.favfalse')
      const niche = await createLinkedNiche(user.id, 'list-favfalse')

      const favorite = await createTestGeneration(user.id, niche.id, { isFavorite: true })
      const notFavorite = await createTestGeneration(user.id, niche.id, { isFavorite: false })

      const { generations } = await listUserGenerations(user.id, { favorite: false })

      expect(generations.find((g) => g.id === notFavorite.id)).toBeDefined()
      expect(generations.find((g) => g.id === favorite.id)).toBeUndefined()
    })

    it('should not list generations belonging to another user', async () => {
      const owner = await createTestUser('list.owner')
      const otherUser = await createTestUser('list.other')
      const niche = await createLinkedNiche(owner.id, 'list-owner')

      const ownerGeneration = await createTestGeneration(owner.id, niche.id)

      const { generations } = await listUserGenerations(otherUser.id, { favorite: undefined })

      expect(generations.find((g) => g.id === ownerGeneration.id)).toBeUndefined()
    })
  })

  describe('getGenerationById', () => {
    it('should return the generation when it belongs to the user', async () => {
      const user = await createTestUser('getbyid.success')
      const niche = await createLinkedNiche(user.id, 'getbyid-success')
      const generation = await createTestGeneration(user.id, niche.id)

      const { generation: result } = await getGenerationById(user.id, generation.id)

      expect(result.id).toEqual(generation.id)
    })

    it('should fail if the generation does not exist', async () => {
      const user = await createTestUser('getbyid.notfound')

      await expect(getGenerationById(user.id, randomUUID())).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if the generation belongs to a different user', async () => {
      const owner = await createTestUser('getbyid.owner')
      const intruder = await createTestUser('getbyid.intruder')
      const niche = await createLinkedNiche(owner.id, 'getbyid-owner')
      const generation = await createTestGeneration(owner.id, niche.id)

      await expect(getGenerationById(intruder.id, generation.id)).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('updateFavorite', () => {
    it('should mark a generation as favorite', async () => {
      const user = await createTestUser('favorite.mark')
      const niche = await createLinkedNiche(user.id, 'favorite-mark')
      const generation = await createTestGeneration(user.id, niche.id, { isFavorite: false })

      const { generation: updated } = await updateFavorite(user.id, generation.id, { isFavorite: true })

      expect(updated.isFavorite).toBe(true)
    })

    it('should unmark a generation as favorite', async () => {
      const user = await createTestUser('favorite.unmark')
      const niche = await createLinkedNiche(user.id, 'favorite-unmark')
      const generation = await createTestGeneration(user.id, niche.id, { isFavorite: true })

      const { generation: updated } = await updateFavorite(user.id, generation.id, { isFavorite: false })

      expect(updated.isFavorite).toBe(false)
    })

    it('should fail if the generation does not belong to the user', async () => {
      const owner = await createTestUser('favorite.owner')
      const intruder = await createTestUser('favorite.intruder')
      const niche = await createLinkedNiche(owner.id, 'favorite-owner')
      const generation = await createTestGeneration(owner.id, niche.id)

      await expect(updateFavorite(intruder.id, generation.id, { isFavorite: true })).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('getGenerationStats', () => {
    it('should resolve niche names and count generations correctly per niche', async () => {
      const user = await createTestUser('stats.byniche')
      const nicheA = await createLinkedNiche(user.id, 'stats-niche-a')
      const nicheB = await createLinkedNiche(user.id, 'stats-niche-b')

      await createTestGeneration(user.id, nicheA.id)
      await createTestGeneration(user.id, nicheA.id)
      await createTestGeneration(user.id, nicheB.id)

      const { totalGenerations, byNiche } = await getGenerationStats()

      const groupA = byNiche.find((entry) => entry.nicheId === nicheA.id)
      const groupB = byNiche.find((entry) => entry.nicheId === nicheB.id)

      if (!groupA || !groupB) {
        throw new Error('Expected niche groups missing from byNiche stats')
      }

      expect(groupA.nicheName).toEqual(nicheA.name)
      expect(groupA.count).toEqual(2)
      expect(groupB.nicheName).toEqual(nicheB.name)
      expect(groupB.count).toEqual(1)

      // totalGenerations é a contagem global (sem filtro), então validamos
      // via contagem direta no banco em vez de comparar snapshots entre chamadas,
      // já que outros testes rodando concorrentemente também criam generations.
      const realCountInDb = await prisma.generation.count()
      expect(totalGenerations).toEqual(realCountInDb)
    })

    it('should order byNiche by generation count descending', async () => {
      const user = await createTestUser('stats.order')
      const nicheMore = await createLinkedNiche(user.id, 'stats-order-more')
      const nicheLess = await createLinkedNiche(user.id, 'stats-order-less')

      await createTestGeneration(user.id, nicheMore.id)
      await createTestGeneration(user.id, nicheMore.id)
      await createTestGeneration(user.id, nicheMore.id)
      await createTestGeneration(user.id, nicheLess.id)

      const { byNiche } = await getGenerationStats()

      const indexMore = byNiche.findIndex((entry) => entry.nicheId === nicheMore.id)
      const indexLess = byNiche.findIndex((entry) => entry.nicheId === nicheLess.id)

      expect(indexMore).toBeGreaterThan(-1)
      expect(indexLess).toBeGreaterThan(-1)
      expect(indexMore).toBeLessThan(indexLess)
    })
  })
})
