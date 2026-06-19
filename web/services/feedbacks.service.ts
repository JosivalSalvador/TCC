import { httpClient } from "../lib/api/http-client";
import { FeedbackInput, FeedbackResponse } from "../types/index";

export const feedbacksService = {
  /**
   * Envia ou atualiza o feedback de uma geração
   * Upsert por (generationId + type) — atualiza se já existir
   */
  upsert: async (generationId: string, data: FeedbackInput) => {
    return httpClient<{ message: string; feedback: FeedbackResponse }>(
      `/generations/${generationId}/feedback`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
};
