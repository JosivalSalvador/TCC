import { z } from 'zod'
import { registerUserSchema, updateUserSchema, updateRoleSchema, updatePasswordSchema } from './users.schema.js'

export type RegisterUserInput = z.infer<typeof registerUserSchema>

// Novos tipos:
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
