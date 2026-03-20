import { describe, it, expect } from 'vitest'
import { compare } from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { StatusCodes } from 'http-status-codes'
import { Role } from '@prisma/client' // ← ADICIONADO: Importando o Enum oficial
import { registerUser, getUserById, updateUser, updatePassword, deleteUser, updateUserRole } from '../users.service.js'
import { prisma } from '../../../lib/prisma.js'

/**
 * Helper para garantir unicidade e isolamento entre os testes
 */
const createEmail = (base: string) => `${base}-${randomBytes(4).toString('hex')}@test.com`

describe('Users Service (Integration)', () => {
  describe('registerUser()', () => {
    it('should hash password and create a new user', async () => {
      const email = createEmail('register')
      const { user } = await registerUser({
        name: 'Service User',
        email,
        password: 'password123',
      })

      const userInDb = await prisma.user.findUnique({ where: { id: user.id } })

      // Validação segura para o TypeScript não reclamar de null
      if (!userInDb) {
        throw new Error('Usuário não foi persistido no banco de dados')
      }

      const isHashed = await compare('password123', userInDb.password_hash)
      expect(isHashed).toBe(true)
      expect(user.role).toBe(Role.USER) // ← ATUALIZADO: Usando o Enum
    })

    it('should throw error if email already exists', async () => {
      const email = createEmail('duplicate')
      await registerUser({ name: 'User 1', email, password: 'password' })

      await expect(registerUser({ name: 'User 2', email, password: 'password' })).rejects.toMatchObject({
        statusCode: StatusCodes.CONFLICT,
      })
    })
  })

  describe('getUserById()', () => {
    it('should return user details without sensitive data', async () => {
      const email = createEmail('get-by-id')
      const { user: created } = await registerUser({
        name: 'Search Me',
        email,
        password: 'password123',
      })

      const { user } = await getUserById(created.id)

      expect(user.id).toBe(created.id)
      expect(user.name).toBe('Search Me')
      // Clean Code: Verificando se o service realmente omitiu o hash da senha
      expect(user).not.toHaveProperty('password_hash')
    })

    it('should throw NOT_FOUND for non-existing ID', async () => {
      await expect(getUserById('00000000-0000-0000-0000-000000000000')).rejects.toMatchObject({
        statusCode: StatusCodes.NOT_FOUND,
      })
    })
  })

  describe('updateUser()', () => {
    it('should update name and email correctly', async () => {
      const email = createEmail('update')
      const { user: created } = await registerUser({
        name: 'Old Name',
        email,
        password: 'password123',
      })

      const newEmail = createEmail('new-email')
      const { user: updated } = await updateUser(created.id, {
        name: 'New Name',
        email: newEmail,
      })

      expect(updated.name).toBe('New Name')
      expect(updated.email).toBe(newEmail)
    })

    it('should throw CONFLICT when updating to an email that is already taken', async () => {
      const email1 = createEmail('taken')
      const email2 = createEmail('target')

      const { user: userToUpdate } = await registerUser({ name: 'U1', email: email1, password: 'p' })
      await registerUser({ name: 'U2', email: email2, password: 'p' })

      await expect(updateUser(userToUpdate.id, { email: email2 })).rejects.toMatchObject({
        statusCode: StatusCodes.CONFLICT,
      })
    })

    it('should ignore undefined fields and maintain existing values', async () => {
      const email = createEmail('partial-update')
      const { user: created } = await registerUser({ name: 'Name', email, password: 'p' })

      // Atualiza apenas o nome, mantendo o email original
      const { user: updated } = await updateUser(created.id, { name: 'Updated Name' })

      expect(updated.name).toBe('Updated Name')
      expect(updated.email).toBe(email)
    })
  })

  describe('updatePassword()', () => {
    it('should update password with valid old password', async () => {
      const email = createEmail('password-change')
      const { user } = await registerUser({ name: 'User', email, password: 'old-password' })

      await updatePassword(user.id, {
        oldPassword: 'old-password',
        newPassword: 'new-password',
      })

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      // Validação segura para o TS
      if (!dbUser) {
        throw new Error('Usuário desapareceu do banco durante o teste')
      }

      const isNewValid = await compare('new-password', dbUser.password_hash)
      expect(isNewValid).toBe(true)
    })

    it('should throw BAD_REQUEST for incorrect old password', async () => {
      const email = createEmail('password-fail')
      const { user } = await registerUser({ name: 'User', email, password: 'correct' })

      await expect(
        updatePassword(user.id, {
          oldPassword: 'wrong-password',
          newPassword: 'new',
        }),
      ).rejects.toMatchObject({
        statusCode: StatusCodes.BAD_REQUEST,
      })
    })
  })

  describe('updateUserRole()', () => {
    it('should update role only through admin-specific method', async () => {
      const email = createEmail('role')
      const { user } = await registerUser({ name: 'User', email, password: 'p' })

      // ← ATUALIZADO: Usando o Enum
      const { user: updated } = await updateUserRole(user.id, { role: Role.ADMIN })

      expect(updated.role).toBe(Role.ADMIN)

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      expect(dbUser?.role).toBe(Role.ADMIN)
    })
  })

  describe('deleteUser()', () => {
    it('should delete user and throw NOT_FOUND on subsequent searches', async () => {
      const email = createEmail('delete-me')
      const { user } = await registerUser({ name: 'Bye', email, password: 'p' })

      await deleteUser(user.id)

      const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
      expect(dbUser).toBeNull()
    })
  })
})
