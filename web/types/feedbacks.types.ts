import { z } from "zod";
import {
  feedbackInputSchema,
  feedbackResponseSchema,
} from "../schemas/feedbacks.schema";

export type FeedbackInput = z.infer<typeof feedbackInputSchema>;
export type FeedbackResponse = z.infer<typeof feedbackResponseSchema>;
