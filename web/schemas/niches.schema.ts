import { z } from "zod";

// ==========================================
// Schema base do nome do nicho
// Exportado para reuso em users.schema.ts (registerUserSchema)
// ==========================================

export const nicheNameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase().replace(/\s+/g, "_"))
  .refine((value) => value.length >= 2, {
    message: "Nome do nicho deve ter no mínimo 2 caracteres",
  });

// ==========================================
// Schema para Criar / Vincular Nicho
// ==========================================

export const nicheInputSchema = z.object({
  name: nicheNameSchema,
});

// ==========================================
// Schema para Desassociar Nicho da Conta
// ==========================================

export const removeNicheSchema = z.object({
  id: z.uuid({ message: "ID do nicho inválido" }),
});

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================

export const nicheResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.coerce.date().optional(),
});
