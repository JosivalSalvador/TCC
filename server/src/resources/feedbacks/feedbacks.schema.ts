import { z } from 'zod'

// ==========================================
// Schema para Enviar Feedback de uma Geração
// type indica qual parte está sendo avaliada: estrutura ou roteiro.
// Restrição de unicidade (1 feedback por type por generation) é
// garantida no banco — aqui o service trata isso como upsert.
// ==========================================

export const feedbackInputSchema = z.object({
  type: z.enum(['STRUCTURE', 'SCRIPT'], {
    error: 'Tipo de feedback inválido. Escolha entre STRUCTURE ou SCRIPT.',
  }),
  isUseful: z.boolean(),
})

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================

export const feedbackResponseSchema = z.object({
  id: z.uuid(),
  generationId: z.uuid(),
  type: z.enum(['STRUCTURE', 'SCRIPT']),
  isUseful: z.boolean(),
  createdAt: z.coerce.date().optional(),
})

// ==========================================
// Schema de Resposta (Estatísticas — Admin)
// Agrega feedbacks por type (STRUCTURE/SCRIPT), cruzado por nicho,
// com percentual de isUseful para medir qualidade por área.
// ==========================================

export const feedbackStatsResponseSchema = z.object({
  total: z.number(),
  byType: z.array(
    z.object({
      type: z.enum(['STRUCTURE', 'SCRIPT']),
      count: z.number(),
      usefulCount: z.number(),
      usefulPercent: z.number(),
    }),
  ),
  byNiche: z.array(
    z.object({
      nicheId: z.uuid(),
      nicheName: z.string(),
      structure: z.object({
        count: z.number(),
        usefulCount: z.number(),
        usefulPercent: z.number(),
      }),
      script: z.object({
        count: z.number(),
        usefulCount: z.number(),
        usefulPercent: z.number(),
      }),
    }),
  ),
})
