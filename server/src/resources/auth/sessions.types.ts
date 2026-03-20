import { z } from 'zod'
import { loginSchema, loginResponseSchema } from './sessions.schema.js'

// Tipos de Entrada
export type LoginInput = z.infer<typeof loginSchema>

// Tipos de Resposta
export type LoginResponse = z.infer<typeof loginResponseSchema>
