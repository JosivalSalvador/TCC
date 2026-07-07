import { z } from 'zod'
import { nicheInputSchema, removeNicheSchema, nicheStatsResponseSchema } from './niches.schema.js'

export type NicheInput = z.infer<typeof nicheInputSchema>
export type RemoveNicheInput = z.infer<typeof removeNicheSchema>
export type NicheStats = z.infer<typeof nicheStatsResponseSchema>
