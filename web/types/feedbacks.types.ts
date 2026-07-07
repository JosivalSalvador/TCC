import { z } from "zod";
import {
  feedbackInputSchema,
  feedbackResponseSchema,
  feedbackStatsResponseSchema,
} from "../schemas/feedbacks.schema";

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;
export type FeedbackStats = z.infer<typeof feedbackStatsResponseSchema>;
