import { describe, it, expect } from 'vitest'
import { randomBytes, randomUUID } from 'node:crypto'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../errors/app-error.js'
import { listAllNiches, listUserNiches, addNicheToUser, removeNicheFromUser, getNicheStats } from '../niches.service.js'

function generateUniqueEmail(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}@test.com`
}

function generateUniqueNicheName(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}`
}

// Helper local: cria um usuário de teste já com password_hash fixo (não é o foco destes testes)
async function createTestUser(emailBase: string) {
  return prisma.user.create({
    data: {
      name: 'Niche Test User',
      email: generateUniqueEmail(emailBase),
      password_hash: 'hash',
    },
  })
}

describe('Niches Service (Integration)', () => {
  describe('listAllNiches', () => {
    it('should list all niches in the global pool ordered alphabetically', async () => {
      // Prefixo único para isolar este teste de outros nichos já existentes no banco
      const prefix = generateUniqueNicheName('zzz-alpha')

      await prisma.niche.create({ data: { name: `${prefix}-b` } })
      await prisma.niche.create({ data: { name: `${prefix}-a` } })
      await prisma.niche.create({ data: { name: `${prefix}-c` } })

      const { niches } = await listAllNiches()

      const filtered = niches.filter((niche) => niche.name.startsWith(prefix))

      expect(filtered).toHaveLength(3)
      expect(filtered.map((niche) => niche.name)).toEqual([`${prefix}-a`, `${prefix}-b`, `${prefix}-c`])
    })
  })

  describe('listUserNiches', () => {
    it('should list only niches linked to the given user, flattened', async () => {
      const user = await createTestUser('list.mine')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('gaming') } })

      await prisma.userNiche.create({
        data: { userId: user.id, nicheId: niche.id },
      })

      const { niches } = await listUserNiches(user.id)

      expect(niches).toHaveLength(1)
      // Garante que o retorno foi achatado: { id, name, createdAt }, sem o wrapper "niche"
      expect(niches[0]).toEqual(
        expect.objectContaining({
          id: niche.id,
          name: niche.name,
        }),
      )
    })

    it('should return an empty list if user has no niches linked', async () => {
      const user = await createTestUser('list.empty')

      const { niches } = await listUserNiches(user.id)

      expect(niches).toEqual([])
    })

    it('should fail if user does not exist', async () => {
      await expect(listUserNiches(randomUUID())).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if user is soft-deleted', async () => {
      const user = await createTestUser('list.deleted')

      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      })

      await expect(listUserNiches(user.id)).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('addNicheToUser', () => {
    it('should create a new niche in the global pool and link it to the user', async () => {
      const user = await createTestUser('add.new')
      const nicheName = generateUniqueNicheName('cooking')

      const { niche } = await addNicheToUser(user.id, { name: nicheName })

      expect(niche.name).toEqual(nicheName)

      const createdNiche = await prisma.niche.findUnique({
        where: { name: nicheName },
      })

      if (!createdNiche) {
        throw new Error('Niche was not created in the global pool')
      }

      const link = await prisma.userNiche.findUnique({
        where: {
          userId_nicheId: {
            userId: user.id,
            nicheId: createdNiche.id,
          },
        },
      })

      expect(link).not.toBeNull()
    })

    it('should reuse an existing niche from the global pool instead of duplicating it (upsert)', async () => {
      const user = await createTestUser('add.existing')
      const nicheName = generateUniqueNicheName('finance')

      // Nicho já existe no pool global, criado por outro fluxo/usuário
      const existingNiche = await prisma.niche.create({ data: { name: nicheName } })

      const { niche } = await addNicheToUser(user.id, { name: nicheName })

      // Deve retornar o MESMO id, não criar um novo Niche
      expect(niche.id).toEqual(existingNiche.id)

      const nicheCount = await prisma.niche.count({ where: { name: nicheName } })
      expect(nicheCount).toEqual(1)
    })

    it('should fail if user does not exist', async () => {
      await expect(addNicheToUser(randomUUID(), { name: generateUniqueNicheName('ghost') })).rejects.toBeInstanceOf(
        AppError,
      )
    })

    it('should fail if niche is already linked to the user account', async () => {
      const user = await createTestUser('add.duplicate')
      const nicheName = generateUniqueNicheName('travel')

      // Primeiro vínculo — deve funcionar normalmente
      await addNicheToUser(user.id, { name: nicheName })

      // Segundo vínculo do mesmo nicho para o mesmo usuário — deve ser bloqueado
      await expect(addNicheToUser(user.id, { name: nicheName })).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('removeNicheFromUser', () => {
    it('should remove only the user link, preserving the niche in the global pool', async () => {
      const user = await createTestUser('remove.success')
      const nicheA = await prisma.niche.create({ data: { name: generateUniqueNicheName('music') } })
      const nicheB = await prisma.niche.create({ data: { name: generateUniqueNicheName('sports') } })

      // Usuário precisa ter mais de 1 nicho para a remoção não ser bloqueada pela regra de negócio
      await prisma.userNiche.create({ data: { userId: user.id, nicheId: nicheA.id } })
      await prisma.userNiche.create({ data: { userId: user.id, nicheId: nicheB.id } })

      await removeNicheFromUser(user.id, { id: nicheA.id })

      const link = await prisma.userNiche.findUnique({
        where: {
          userId_nicheId: {
            userId: user.id,
            nicheId: nicheA.id,
          },
        },
      })
      expect(link).toBeNull()

      // O Niche global deve continuar existindo — apenas o vínculo foi removido
      const nicheStillExists = await prisma.niche.findUnique({ where: { id: nicheA.id } })
      expect(nicheStillExists).not.toBeNull()
    })

    it('should fail if user does not exist', async () => {
      await expect(removeNicheFromUser(randomUUID(), { id: randomUUID() })).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if the niche is not linked to the user account', async () => {
      const user = await createTestUser('remove.notlinked')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('history') } })

      await expect(removeNicheFromUser(user.id, { id: niche.id })).rejects.toBeInstanceOf(AppError)
    })

    it('should fail (422) if it is the last niche of the user, and must not remove the link', async () => {
      const user = await createTestUser('remove.last')
      const niche = await prisma.niche.create({ data: { name: generateUniqueNicheName('lastone') } })

      await prisma.userNiche.create({ data: { userId: user.id, nicheId: niche.id } })

      await expect(removeNicheFromUser(user.id, { id: niche.id })).rejects.toBeInstanceOf(AppError)

      // Garante que o vínculo NÃO foi removido, já que a regra de negócio bloqueou a operação
      const link = await prisma.userNiche.findUnique({
        where: {
          userId_nicheId: {
            userId: user.id,
            nicheId: niche.id,
          },
        },
      })
      expect(link).not.toBeNull()
    })
  })

  describe('getNicheStats', () => {
    it('should return the total count and monthly growth as plain numbers', async () => {
      await prisma.niche.create({ data: { name: generateUniqueNicheName('stats-check') } })

      const { total, monthlyGrowth } = await getNicheStats()

      expect(total).toBeGreaterThan(0)
      expect(typeof total).toBe('number')

      expect(monthlyGrowth.length).toBeGreaterThan(0)

      for (const entry of monthlyGrowth) {
        // Garante que o bigint retornado pelo $queryRaw foi convertido corretamente
        expect(typeof entry.count).toBe('number')
        expect(entry.month).toMatch(/^\d{4}-\d{2}$/)
      }
    })
  })
})
