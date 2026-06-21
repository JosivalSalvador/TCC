import { z } from 'zod'
import { feedbackInputSchema, feedbackStatsResponseSchema } from './feedbacks.schema.js'

export type FeedbackInput = z.infer<typeof feedbackInputSchema>
export type FeedbackStats = z.infer<typeof feedbackStatsResponseSchema>
