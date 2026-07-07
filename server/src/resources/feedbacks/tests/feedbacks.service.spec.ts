import { describe, it, expect } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../errors/app-error.js'
import { upsertFeedback, getFeedbackStats } from '../feedbacks.service.js'

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
      name: 'Feedbacks Test User',
      email: generateUniqueEmail(emailBase),
      password_hash: await hash('Password123!', 6),
    },
  })
}

// Helper local: cria uma Generation completa, já que ela exige nicheRequested,
// structureContent e scriptContent obrigatórios (ver schema.prisma).
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

describe('Feedbacks Service (Integration)', () => {
  describe('upsertFeedback', () => {
    it('should create a new feedback when none exists yet for this type', async () => {
      const user = await createTestUser('feedback.create')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('feedback-create') } })
      const generation = await createTestGeneration(user.id, niche.id)

      const { feedback } = await upsertFeedback(user.id, generation.id, {
        type: 'STRUCTURE',
        isUseful: true,
      })

      expect(feedback.generationId).toEqual(generation.id)
      expect(feedback.type).toEqual('STRUCTURE')
      expect(feedback.isUseful).toBe(true)

      const stored = await prisma.generationFeedback.findUnique({
        where: { generationId_type: { generationId: generation.id, type: 'STRUCTURE' } },
      })
      expect(stored).not.toBeNull()
    })

    it('should update the existing feedback instead of creating a duplicate (upsert)', async () => {
      const user = await createTestUser('feedback.update')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('feedback-update') } })
      const generation = await createTestGeneration(user.id, niche.id)

      await upsertFeedback(user.id, generation.id, { type: 'SCRIPT', isUseful: false })
      const { feedback: updated } = await upsertFeedback(user.id, generation.id, {
        type: 'SCRIPT',
        isUseful: true,
      })

      expect(updated.isUseful).toBe(true)

      const count = await prisma.generationFeedback.count({
        where: { generationId: generation.id, type: 'SCRIPT' },
      })
      expect(count).toEqual(1)
    })

    it('should treat STRUCTURE and SCRIPT as independent feedbacks for the same generation', async () => {
      const user = await createTestUser('feedback.independent')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('feedback-independent') } })
      const generation = await createTestGeneration(user.id, niche.id)

      await upsertFeedback(user.id, generation.id, { type: 'STRUCTURE', isUseful: true })
      await upsertFeedback(user.id, generation.id, { type: 'SCRIPT', isUseful: false })

      const structureFeedback = await prisma.generationFeedback.findUnique({
        where: { generationId_type: { generationId: generation.id, type: 'STRUCTURE' } },
      })
      const scriptFeedback = await prisma.generationFeedback.findUnique({
        where: { generationId_type: { generationId: generation.id, type: 'SCRIPT' } },
      })

      expect(structureFeedback?.isUseful).toBe(true)
      expect(scriptFeedback?.isUseful).toBe(false)
    })

    it('should fail if the generation does not exist', async () => {
      const user = await createTestUser('feedback.nogen')

      await expect(upsertFeedback(user.id, randomUUID(), { type: 'STRUCTURE', isUseful: true })).rejects.toBeInstanceOf(
        AppError,
      )
    })

    it('should fail if the generation belongs to a different user', async () => {
      const owner = await createTestUser('feedback.owner')
      const intruder = await createTestUser('feedback.intruder')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('feedback-owner') } })
      const generation = await createTestGeneration(owner.id, niche.id)

      await expect(
        upsertFeedback(intruder.id, generation.id, { type: 'STRUCTURE', isUseful: true }),
      ).rejects.toBeInstanceOf(AppError)

      // Garante que nenhum feedback foi criado indevidamente em nome do dono
      const stored = await prisma.generationFeedback.findUnique({
        where: { generationId_type: { generationId: generation.id, type: 'STRUCTURE' } },
      })
      expect(stored).toBeNull()
    })
  })

  describe('getFeedbackStats', () => {
    it('should reflect newly created feedbacks in the total count', async () => {
      const user = await createTestUser('stats.total')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-total') } })
      const generation = await createTestGeneration(user.id, niche.id)

      const { total: totalBefore } = await getFeedbackStats()

      await upsertFeedback(user.id, generation.id, { type: 'STRUCTURE', isUseful: true })

      const { total: totalAfter } = await getFeedbackStats()

      expect(totalAfter).toEqual(totalBefore + 1)
    })

    it('should aggregate byType with the correct usefulPercent', async () => {
      const user = await createTestUser('stats.bytype')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-bytype') } })

      // Duas generations distintas para poder ter dois feedbacks STRUCTURE independentes
      const generationA = await createTestGeneration(user.id, niche.id)
      const generationB = await createTestGeneration(user.id, niche.id)

      await upsertFeedback(user.id, generationA.id, { type: 'STRUCTURE', isUseful: true })
      await upsertFeedback(user.id, generationB.id, { type: 'STRUCTURE', isUseful: false })

      const { byType } = await getFeedbackStats()

      const structureGroup = byType.find((entry) => entry.type === 'STRUCTURE')
      if (!structureGroup) {
        throw new Error('STRUCTURE group missing from byType stats')
      }

      expect(structureGroup.count).toBeGreaterThanOrEqual(2)
      expect(structureGroup.usefulCount).toBeGreaterThanOrEqual(1)
      // Sanity check matemático: usefulPercent deve corresponder a usefulCount/count arredondado
      const expectedPercent = Math.round((structureGroup.usefulCount / structureGroup.count) * 100)
      expect(structureGroup.usefulPercent).toEqual(expectedPercent)
    })

    it('should aggregate byNiche separating structure and script per niche, without mixing niches', async () => {
      const user = await createTestUser('stats.byniche')
      const nicheA = await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-niche-a') } })
      const nicheB = await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-niche-b') } })

      const generationNicheA = await createTestGeneration(user.id, nicheA.id)
      const generationNicheB = await createTestGeneration(user.id, nicheB.id)

      await upsertFeedback(user.id, generationNicheA.id, { type: 'STRUCTURE', isUseful: true })
      await upsertFeedback(user.id, generationNicheA.id, { type: 'SCRIPT', isUseful: true })
      await upsertFeedback(user.id, generationNicheB.id, { type: 'STRUCTURE', isUseful: false })

      const { byNiche } = await getFeedbackStats()

      const groupA = byNiche.find((entry) => entry.nicheId === nicheA.id)
      const groupB = byNiche.find((entry) => entry.nicheId === nicheB.id)

      if (!groupA || !groupB) {
        throw new Error('Expected niche groups missing from byNiche stats')
      }

      expect(groupA.nicheName).toEqual(nicheA.name)
      expect(groupA.structure.count).toEqual(1)
      expect(groupA.structure.usefulCount).toEqual(1)
      expect(groupA.script.count).toEqual(1)
      expect(groupA.script.usefulCount).toEqual(1)

      // Nicho B só recebeu STRUCTURE — script deve ficar zerado, sem herdar nada do nicho A
      expect(groupB.structure.count).toEqual(1)
      expect(groupB.structure.usefulCount).toEqual(0)
      expect(groupB.script.count).toEqual(0)
      expect(groupB.script.usefulPercent).toEqual(0)
    })
  })
})
