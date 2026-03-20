// resources/tokens/tokens.schema.ts
import { z } from 'zod'
import { TokenType } from '@prisma/client'

// Schema para criação genérica de tokens (útil para o Service)
export const createTokenSchema = z.object({
  userId: z.uuid(),
  type: z.enum(TokenType),
})

// Schema de resposta de sucesso (para reaproveitar no Router)
export const tokenResponseSchema = z.object({
  token: z.string().describe('Novo JWT Access Token'),
})

// Schema de erro padrão (para reaproveitar no Router)
export const tokenErrorSchema = z.object({
  message: z.string(),
})
