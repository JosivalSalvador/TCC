import { describe, it, expect } from 'vitest'
import { hash, compare } from 'bcryptjs'
import { randomBytes, randomUUID } from 'node:crypto'
import { Role } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../errors/app-error.js'
import {
  registerUser,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
  listAllUsers,
  updateUserRole,
  getUserStats,
} from '../users.service.js'

function generateUniqueEmail(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}@test.com`
}

function generateUniqueNicheName(base: string) {
  const hashString = randomBytes(4).toString('hex')
  return `${base}-${hashString}`
}

const VALID_PASSWORD = 'Password123!'

// Helper local: cria um usuário direto no banco (fora do fluxo de registerUser),
// útil para testes que não estão focados no cadastro em si.
// Com exactOptionalPropertyTypes: true, a chave "role" só pode ser incluída no
// objeto quando de fato houver um valor — nunca como "role: undefined".
async function createTestUser(emailBase: string, role?: Role) {
  return prisma.user.create({
    data: {
      name: 'Users Test User',
      email: generateUniqueEmail(emailBase),
      password_hash: await hash(VALID_PASSWORD, 6),
      ...(role !== undefined && { role }),
    },
  })
}

describe('Users Service (Integration)', () => {
  describe('registerUser', () => {
    it('should create a user, upsert a new niche and link them together', async () => {
      const email = generateUniqueEmail('register.new')
      const nicheName = generateUniqueNicheName('gardening')

      const { user } = await registerUser({
        name: 'New Register User',
        email,
        password: VALID_PASSWORD,
        nicheName,
      })

      expect(user.email).toEqual(email)
      expect(user.name).toEqual('New Register User')

      const createdNiche = await prisma.niche.findUnique({ where: { name: nicheName } })
      if (!createdNiche) {
        throw new Error('Niche was not created during registration')
      }

      const link = await prisma.userNiche.findUnique({
        where: { userId_nicheId: { userId: user.id, nicheId: createdNiche.id } },
      })
      expect(link).not.toBeNull()
    })

    it('should reuse an existing niche instead of duplicating it (upsert)', async () => {
      const nicheName = generateUniqueNicheName('existing-pool')
      const existingNiche = await prisma.niche.create({ data: { name: nicheName } })

      const { user } = await registerUser({
        name: 'Reuse Niche User',
        email: generateUniqueEmail('register.reuse'),
        password: VALID_PASSWORD,
        nicheName,
      })

      const link = await prisma.userNiche.findUnique({
        where: { userId_nicheId: { userId: user.id, nicheId: existingNiche.id } },
      })
      expect(link).not.toBeNull()

      const nicheCount = await prisma.niche.count({ where: { name: nicheName } })
      expect(nicheCount).toEqual(1)
    })

    it('should fail if email already exists', async () => {
      const email = generateUniqueEmail('register.dup')

      await prisma.user.create({
        data: {
          name: 'Existing User',
          email,
          password_hash: await hash(VALID_PASSWORD, 6),
        },
      })

      await expect(
        registerUser({
          name: 'Duplicate Attempt',
          email,
          password: VALID_PASSWORD,
          nicheName: generateUniqueNicheName('irrelevant'),
        }),
      ).rejects.toBeInstanceOf(AppError)
    })

    it('should not create a niche if registration fails due to duplicate email', async () => {
      const email = generateUniqueEmail('register.dup.niche')
      const nicheName = generateUniqueNicheName('should-not-exist')

      await prisma.user.create({
        data: {
          name: 'Existing User',
          email,
          password_hash: await hash(VALID_PASSWORD, 6),
        },
      })

      await expect(
        registerUser({ name: 'Attempt', email, password: VALID_PASSWORD, nicheName }),
      ).rejects.toBeInstanceOf(AppError)

      const niche = await prisma.niche.findUnique({ where: { name: nicheName } })
      expect(niche).toBeNull()
    })
  })

  describe('getUserById', () => {
    it('should return the user when found', async () => {
      const user = await createTestUser('getbyid.success')

      const { user: result } = await getUserById(user.id)

      expect(result.id).toEqual(user.id)
      expect(result.email).toEqual(user.email)
    })

    it('should fail if user does not exist', async () => {
      await expect(getUserById(randomUUID())).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if user is soft-deleted', async () => {
      const user = await createTestUser('getbyid.deleted')

      await prisma.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } })

      await expect(getUserById(user.id)).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('updateUser', () => {
    it('should update the name', async () => {
      const user = await createTestUser('update.name')

      const { user: updated } = await updateUser(user.id, { name: 'Updated Name' })

      expect(updated.name).toEqual('Updated Name')
    })

    it('should update the email when available', async () => {
      const user = await createTestUser('update.email')
      const newEmail = generateUniqueEmail('update.email.new')

      const { user: updated } = await updateUser(user.id, { email: newEmail })

      expect(updated.email).toEqual(newEmail)
    })

    it('should not throw a conflict when "updating" the email to the same current value', async () => {
      const user = await createTestUser('update.same.email')

      await expect(updateUser(user.id, { email: user.email })).resolves.not.toThrow()
    })

    it('should fail if user does not exist', async () => {
      await expect(updateUser(randomUUID(), { name: 'Ghost' })).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if the new email is already in use by another active account', async () => {
      const userA = await createTestUser('update.conflict.a')
      const userB = await createTestUser('update.conflict.b')

      await expect(updateUser(userB.id, { email: userA.email })).rejects.toBeInstanceOf(AppError)
    })

    it('should allow reusing an email that belongs to a soft-deleted account', async () => {
      const deletedUser = await createTestUser('update.reuse.deleted')
      const releasedEmail = deletedUser.email

      await deleteUser(deletedUser.id)

      const activeUser = await createTestUser('update.reuse.active')

      // O e-mail original do usuário deletado foi liberado (sufixado no banco),
      // então outra conta ativa deve poder reivindicá-lo sem conflito.
      await expect(updateUser(activeUser.id, { email: releasedEmail })).resolves.not.toThrow()
    })
  })

  describe('updatePassword', () => {
    it('should update the password when old password matches', async () => {
      const user = await createTestUser('password.success')
      const newPassword = 'NewPassword456!'

      await updatePassword(user.id, { oldPassword: VALID_PASSWORD, newPassword })

      const updated = await prisma.user.findUnique({ where: { id: user.id } })
      if (!updated) {
        throw new Error('User disappeared after password update')
      }

      const matchesNew = await compare(newPassword, updated.password_hash)
      const matchesOld = await compare(VALID_PASSWORD, updated.password_hash)

      expect(matchesNew).toBe(true)
      expect(matchesOld).toBe(false)
    })

    it('should fail if user does not exist', async () => {
      await expect(
        updatePassword(randomUUID(), { oldPassword: VALID_PASSWORD, newPassword: 'Whatever123!' }),
      ).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if old password does not match', async () => {
      const user = await createTestUser('password.wrong')

      await expect(
        updatePassword(user.id, { oldPassword: 'WrongOldPassword!', newPassword: 'NewPassword456!' }),
      ).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('deleteUser', () => {
    it('should soft delete the user, suffix the email and remove their tokens', async () => {
      const user = await createTestUser('delete.success')
      const originalEmail = user.email

      await prisma.token.create({
        data: { type: 'REFRESH_TOKEN', userId: user.id, expiresAt: new Date() },
      })

      await deleteUser(user.id)

      const deleted = await prisma.user.findUnique({ where: { id: user.id } })
      if (!deleted) {
        throw new Error('User was physically removed instead of soft-deleted')
      }

      expect(deleted.deletedAt).not.toBeNull()
      expect(deleted.email).toContain(originalEmail)
      expect(deleted.email).not.toEqual(originalEmail)

      const remainingTokens = await prisma.token.count({ where: { userId: user.id } })
      expect(remainingTokens).toEqual(0)
    })

    it('should not affect tokens belonging to other users', async () => {
      const userToDelete = await createTestUser('delete.other.target')
      const untouchedUser = await createTestUser('delete.other.bystander')

      await prisma.token.create({
        data: { type: 'REFRESH_TOKEN', userId: untouchedUser.id, expiresAt: new Date() },
      })

      await deleteUser(userToDelete.id)

      const bystanderTokens = await prisma.token.count({ where: { userId: untouchedUser.id } })
      expect(bystanderTokens).toEqual(1)
    })

    it('should fail if user does not exist', async () => {
      await expect(deleteUser(randomUUID())).rejects.toBeInstanceOf(AppError)
    })

    it('should fail if user is already soft-deleted (idempotency guard)', async () => {
      const user = await createTestUser('delete.twice')

      await deleteUser(user.id)

      await expect(deleteUser(user.id)).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('listAllUsers', () => {
    it('should list only active users, ordered by most recently created first', async () => {
      const older = await createTestUser('list.older')
      const newer = await createTestUser('list.newer')

      const { users } = await listAllUsers()

      const olderIndex = users.findIndex((u) => u.id === older.id)
      const newerIndex = users.findIndex((u) => u.id === newer.id)

      expect(olderIndex).toBeGreaterThan(-1)
      expect(newerIndex).toBeGreaterThan(-1)
      // O mais recente deve aparecer antes na listagem (desc)
      expect(newerIndex).toBeLessThan(olderIndex)
    })

    it('should not include soft-deleted users', async () => {
      const user = await createTestUser('list.deleted')
      await deleteUser(user.id)

      const { users } = await listAllUsers()

      expect(users.find((u) => u.id === user.id)).toBeUndefined()
    })
  })

  describe('updateUserRole', () => {
    it('should update the role of the user', async () => {
      const user = await createTestUser('role.update', Role.USER)

      const { user: updated } = await updateUserRole(user.id, { role: Role.SUPPORTER })

      expect(updated.role).toEqual(Role.SUPPORTER)
    })

    it('should fail if user does not exist', async () => {
      await expect(updateUserRole(randomUUID(), { role: Role.ADMIN })).rejects.toBeInstanceOf(AppError)
    })
  })

  describe('getUserStats', () => {
    it('should return the total of active users and the correct count grouped by role', async () => {
      await createTestUser('stats.user.a', Role.USER)
      await createTestUser('stats.user.b', Role.USER)
      const adminUser = await createTestUser('stats.admin', Role.ADMIN)

      const { total, byRole } = await getUserStats()

      expect(total).toBeGreaterThanOrEqual(3)

      const adminGroup = byRole.find((entry) => entry.role === Role.ADMIN)
      if (!adminGroup) {
        throw new Error('ADMIN group missing from stats')
      }
      expect(adminGroup.count).toBeGreaterThanOrEqual(1)

      // Sanity check: soma dos grupos deve bater com o total
      const sum = byRole.reduce((acc, entry) => acc + entry.count, 0)
      expect(sum).toEqual(total)

      // Usuário admin criado neste teste deve estar refletido em algum grupo
      const adminCheck = await prisma.user.findUnique({ where: { id: adminUser.id } })
      expect(adminCheck?.role).toEqual(Role.ADMIN)
    })

    it('should not count soft-deleted users in the total', async () => {
      const user = await createTestUser('stats.deleted')

      await deleteUser(user.id)

      const { total } = await getUserStats()

      // Em vez de comparar dois snapshots do total (frágil sob execução
      // paralela de specs, já que outros arquivos criam Users no mesmo
      // banco entre as duas leituras), validamos diretamente que o total
      // ativo bate com a contagem real de usuários não deletados no banco,
      // e que o total é estritamente menor que a contagem de "todos os
      // usuários" (incluindo o soft-deletado que acabamos de criar).
      const activeCountInDb = await prisma.user.count({ where: { deletedAt: null } })
      const allCountInDb = await prisma.user.count()

      expect(total).toEqual(activeCountInDb)
      expect(total).toBeLessThan(allCountInDb)

      // Confirma especificamente que o usuário deletado neste teste
      // não está sendo contado como ativo.
      const deletedUserIsActive = await prisma.user.count({ where: { id: user.id, deletedAt: null } })
      expect(deletedUserIsActive).toEqual(0)
    })
  })
})
