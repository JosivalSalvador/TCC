import { z } from 'zod'
import {
  createGenerationSchema,
  listGenerationsQuerySchema,
  favoriteUpdateSchema,
  generationStatsResponseSchema,
} from './generations.schema.js'

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>
export type ListGenerationsQuery = z.infer<typeof listGenerationsQuerySchema>
export type FavoriteUpdateInput = z.infer<typeof favoriteUpdateSchema>
export type GenerationStats = z.infer<typeof generationStatsResponseSchema>
