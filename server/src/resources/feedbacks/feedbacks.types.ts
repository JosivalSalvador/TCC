import { z } from 'zod'
import { feedbackInputSchema } from './feedbacks.schema.js'

export type FeedbackInput = z.infer<typeof feedbackInputSchema>
