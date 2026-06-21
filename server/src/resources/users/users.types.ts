import { z } from 'zod'
import {
  registerUserSchema,
  updateUserSchema,
  updateRoleSchema,
  updatePasswordSchema,
  userStatsResponseSchema,
} from './users.schema.js'

export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
export type UserStats = z.infer<typeof userStatsResponseSchema>
