import { z } from "zod";
import { FeedbackType } from "../types/enums";

// ==========================================
// Schema para Enviar Feedback de uma Geração
// ==========================================

export const feedbackInputSchema = z.object({
  type: z.enum([FeedbackType.STRUCTURE, FeedbackType.SCRIPT], {
    error: "Tipo de feedback inválido. Escolha entre STRUCTURE ou SCRIPT.",
  }),
  isUseful: z.boolean(),
});

// ==========================================
// Schema de Resposta (Retorno da API)
// ==========================================

export const feedbackResponseSchema = z.object({
  id: z.uuid(),
  generationId: z.uuid(),
  type: z.enum([FeedbackType.STRUCTURE, FeedbackType.SCRIPT]),
  isUseful: z.boolean(),
  createdAt: z.coerce.date().optional(),
});
