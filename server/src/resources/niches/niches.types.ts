import { z } from 'zod'
import { nicheInputSchema, removeNicheSchema } from './niches.schema.js'

export type NicheInput = z.infer<typeof nicheInputSchema>
export type RemoveNicheInput = z.infer<typeof removeNicheSchema>
