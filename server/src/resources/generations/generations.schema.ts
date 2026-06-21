import { z } from 'zod'

// ==========================================
// Schema para Criar uma Geração
// O usuário escolhe um nicho que já está vinculado à conta dele,
// por isso aqui é nicheId (não nicheName como no cadastro).
// ==========================================

export const createGenerationSchema = z.object({
  nicheId: z.uuid({ message: 'ID do nicho inválido' }),
  audienceCountry: z.string().trim().optional(),
})

// ==========================================
// Schema para Listar Gerações (query params)
// favorite é opcional — quando ausente, lista tudo.
// Quando presente, filtra pelo valor (alimenta a tela de Favoritos).
// ==========================================

export const listGenerationsQuerySchema = z.object({
  favorite: z.coerce.boolean().optional(),
})

// ==========================================
// Schema para Marcar/Desmarcar Favorito
// ==========================================

export const favoriteUpdateSchema = z.object({
  isFavorite: z.boolean(),
})

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================

export const generationResponseSchema = z.object({
  id: z.uuid(),
  nicheId: z.uuid(),
  nicheRequested: z.string(),
  fallbackUsed: z.boolean(),
  audienceCountry: z.string().nullable(),
  structureContent: z.record(z.string(), z.unknown()),
  scriptContent: z.record(z.string(), z.unknown()),
  isFavorite: z.boolean(),
  createdAt: z.coerce.date().optional(),
})

// ==========================================
// Schema de Resposta (Estatísticas — Admin)
// Quantidade de gerações por nicho, com o nome já resolvido
// (evita o front ter que cruzar com a lista de nichos pra exibir).
// ==========================================

export const generationStatsResponseSchema = z.object({
  totalGenerations: z.number(),
  byNiche: z.array(
    z.object({
      nicheId: z.uuid(),
      nicheName: z.string(),
      count: z.number(),
    }),
  ),
})
