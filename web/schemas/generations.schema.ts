import { z } from "zod";

// ==========================================
// Schema para Criar uma Geração
// ==========================================

export const createGenerationSchema = z.object({
  nicheId: z.uuid({ message: "ID do nicho inválido" }),
  audienceCountry: z.string().trim().optional(),
});

// ==========================================
// Schema para Listar Gerações (query params)
// ==========================================

export const listGenerationsQuerySchema = z.object({
  favorite: z.coerce.boolean().optional(),
});

// ==========================================
// Schema para Marcar/Desmarcar Favorito
// ==========================================

export const favoriteUpdateSchema = z.object({
  isFavorite: z.boolean(),
});

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
});
