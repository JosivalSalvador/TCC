import { httpClient } from "../lib/api/http-client";
import { FeedbackInput, FeedbackResponse, FeedbackStats } from "../types/index";

export const feedbacksService = {
  upsert: async (generationId: string, data: FeedbackInput) => {
    return httpClient<{ message: string; feedback: FeedbackResponse }>(
      `/generations/${generationId}/feedback`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  getStats: async () => {
    return httpClient<FeedbackStats>("/feedbacks/stats");
  },
};
