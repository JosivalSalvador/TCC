import { z } from 'zod'

// ==========================================
// Schema base do nome do nicho
// Exportado para reuso em outros schemas (ex: registerUserSchema)
// ==========================================

export const nicheNameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => value.length >= 2, {
    message: 'Nome do nicho deve ter no mínimo 2 caracteres',
  })

// ==========================================
// Schema para Criar / Vincular Nicho
// (usado no cadastro e no gerenciamento de nichos)
// ==========================================

export const nicheInputSchema = z.object({
  name: nicheNameSchema,
})

// ==========================================
// Schema para Desassociar Nicho da Conta
// ==========================================

export const removeNicheSchema = z.object({
  id: z.uuid({ message: 'ID do nicho inválido' }),
})

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================

export const nicheResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
})

// ==========================================
// Schema de Resposta (Estatísticas — Admin)
// total = tamanho atual do pool global
// monthlyGrowth = quantidade de nichos criados por mês (série temporal)
// ==========================================

export const nicheStatsResponseSchema = z.object({
  total: z.number(),
  monthlyGrowth: z.array(
    z.object({
      month: z.string(), // formato 'YYYY-MM'
      count: z.number(),
    }),
  ),
})
