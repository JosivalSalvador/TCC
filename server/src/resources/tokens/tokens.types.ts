// resources/tokens/tokens.types.ts
import { z } from 'zod'
import { TokenType } from '@prisma/client'
import { createTokenSchema } from './tokens.schema.js'

// 1. Tipos inferidos do Zod
export type CreateTokenInput = z.infer<typeof createTokenSchema>

// 2. Configurações de TTL (Substitui o antigo tokens.config.ts)
// Centralizamos as regras de tempo para REFRESH, PASSWORD_RESET e EMAIL_VERIFY
export const TOKEN_TTL_CONFIG = {
  [TokenType.REFRESH_TOKEN]: {
    days: 7,
    // Função utilitária para já devolver a data exata de expiração para o Prisma
    getExpirationDate: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
} as const
