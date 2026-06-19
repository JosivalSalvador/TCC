"use server";

import { feedbacksService } from "../services/feedbacks.service";
import { FeedbackInput, FeedbackResponse, HttpError } from "../types/index";

type ActionResponse<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

export async function upsertFeedbackAction(
  generationId: string,
  data: FeedbackInput,
): Promise<ActionResponse<{ feedback: FeedbackResponse }>> {
  try {
    const response = await feedbacksService.upsert(generationId, data);

    return {
      success: true,
      data: { feedback: response.feedback },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao enviar feedback.",
    };
  }
}
