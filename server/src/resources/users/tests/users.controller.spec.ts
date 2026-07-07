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
      name: 'Users Controller Test User',
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

describe('Users Controller (E2E)', () => {
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /users (Register)', () => {
    it('should register a new user and return 201 with the userId', async () => {
      const email = generateUniqueEmail('register.ok')

      const response = await request(app.server)
        .post('/api/v1/users')
        .send({
          name: 'Brand New User',
          email,
          password: VALID_PASSWORD,
          nicheName: generateUniqueNicheName('cooking'),
        })

      expect(response.statusCode).toBe(StatusCodes.CREATED)
      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('userId')

      const createdUser = await prisma.user.findUnique({ where: { id: response.body.userId } })
      expect(createdUser).not.toBeNull()
    })

    it('should reject registration with a duplicate email (409 CONFLICT)', async () => {
      const email = generateUniqueEmail('register.dup')

      await prisma.user.create({
        data: {
          name: 'Existing User',
          email,
          password_hash: await hash(VALID_PASSWORD, 6),
        },
      })

      const response = await request(app.server)
        .post('/api/v1/users')
        .send({
          name: 'Duplicate Attempt',
          email,
          password: VALID_PASSWORD,
          nicheName: generateUniqueNicheName('duplicate-flow'),
        })

      expect(response.statusCode).toBe(StatusCodes.CONFLICT)
      expect(response.body).toHaveProperty('message')
    })
  })

  describe('GET /users/me', () => {
    it('should return the authenticated user profile', async () => {
      const { user, token } = await createAuthenticatedUser('me.get')

      const response = await request(app.server).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.user).toEqual(expect.objectContaining({ id: user.id, email: user.email }))
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/users/me')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('PATCH /users/me', () => {
    it('should update the authenticated user profile', async () => {
      const { token } = await createAuthenticatedUser('me.patch')

      const response = await request(app.server)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Renamed Profile' })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.user.name).toEqual('Renamed Profile')
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).patch('/api/v1/users/me').send({ name: 'No Auth' })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('POST /users/me/password', () => {
    it('should change the password successfully', async () => {
      const { token } = await createAuthenticatedUser('password.ok')

      const response = await request(app.server)
        .post('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: VALID_PASSWORD, newPassword: 'NewPassword456!' })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('message')
    })

    it('should reject with 400 when the old password is wrong', async () => {
      const { token } = await createAuthenticatedUser('password.wrong')

      const response = await request(app.server)
        .post('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ oldPassword: 'WrongOldPassword!', newPassword: 'NewPassword456!' })

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST)
      expect(response.body).toHaveProperty('message')
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server)
        .post('/api/v1/users/me/password')
        .send({ oldPassword: VALID_PASSWORD, newPassword: 'NewPassword456!' })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('DELETE /users/me', () => {
    it('should delete the own account, clear the refreshToken cookie and return 204', async () => {
      const { user, token } = await createAuthenticatedUser('me.delete')

      const response = await request(app.server).delete('/api/v1/users/me').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT)

      const cookiesHeader = response.headers['set-cookie']
      if (!cookiesHeader) {
        throw new Error('O header set-cookie para limpar o refreshToken não foi retornado')
      }
      expect(cookiesHeader[0]).toContain('refreshToken=;')

      const deletedUser = await prisma.user.findUnique({ where: { id: user.id } })
      expect(deletedUser?.deletedAt).not.toBeNull()
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).delete('/api/v1/users/me')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /users/stats (Admin only)', () => {
    it('should return stats for an admin user', async () => {
      const { token } = await createAuthenticatedUser('stats.admin', Role.ADMIN)

      const response = await request(app.server).get('/api/v1/users/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body).toHaveProperty('total')
      expect(response.body).toHaveProperty('byRole')
      expect(Array.isArray(response.body.byRole)).toBe(true)
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('stats.user', Role.USER)

      const response = await request(app.server).get('/api/v1/users/stats').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/users/stats')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('GET /users (Admin only, list all)', () => {
    it('should list all active users for an admin', async () => {
      const { token } = await createAuthenticatedUser('list.admin', Role.ADMIN)
      const { user: targetUser } = await createAuthenticatedUser('list.target', Role.USER)

      const response = await request(app.server).get('/api/v1/users').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.users).toEqual(expect.arrayContaining([expect.objectContaining({ id: targetUser.id })]))
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('list.user', Role.USER)

      const response = await request(app.server).get('/api/v1/users').set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).get('/api/v1/users')

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('PATCH /users/:id/role (Admin only)', () => {
    it('should update the role of the target user', async () => {
      const { token } = await createAuthenticatedUser('role.admin', Role.ADMIN)
      const { user: targetUser } = await createAuthenticatedUser('role.target', Role.USER)

      const response = await request(app.server)
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: Role.SUPPORTER })

      expect(response.statusCode).toBe(StatusCodes.OK)
      expect(response.body.user.role).toEqual(Role.SUPPORTER)

      const updated = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(updated?.role).toEqual(Role.SUPPORTER)
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('role.nonadmin', Role.USER)
      const { user: targetUser } = await createAuthenticatedUser('role.nonadmin.target', Role.USER)

      const response = await request(app.server)
        .patch(`/api/v1/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: Role.ADMIN })

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).patch(`/api/v1/users/${randomUUID()}/role`).send({ role: Role.ADMIN })

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })

  describe('DELETE /users/:id (Admin only)', () => {
    it('should soft delete the target user and return 204', async () => {
      const { token } = await createAuthenticatedUser('admindelete.admin', Role.ADMIN)
      const { user: targetUser } = await createAuthenticatedUser('admindelete.target', Role.USER)

      const response = await request(app.server)
        .delete(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.NO_CONTENT)

      const deleted = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('should reject a non-admin user with 403 FORBIDDEN', async () => {
      const { token } = await createAuthenticatedUser('admindelete.nonadmin', Role.USER)
      const { user: targetUser } = await createAuthenticatedUser('admindelete.nonadmin.target', Role.USER)

      const response = await request(app.server)
        .delete(`/api/v1/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toBe(StatusCodes.FORBIDDEN)
    })

    it('should reject without a token (401)', async () => {
      const response = await request(app.server).delete(`/api/v1/users/${randomUUID()}`)

      expect(response.statusCode).toBe(StatusCodes.UNAUTHORIZED)
    })
  })
})
