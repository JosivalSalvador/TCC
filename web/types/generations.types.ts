import { z } from "zod";
import {
  createGenerationSchema,
  listGenerationsQuerySchema,
  favoriteUpdateSchema,
  generationResponseSchema,
} from "../schemas/generations.schema";

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
export type ListGenerationsQuery = z.infer<typeof listGenerationsQuerySchema>;
export type FavoriteUpdateInput = z.infer<typeof favoriteUpdateSchema>;
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
