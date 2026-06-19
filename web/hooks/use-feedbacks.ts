// web/hooks/use-feedbacks.ts

import { useMutation } from "@tanstack/react-query";
import { upsertFeedbackAction } from "../actions/feedbacks.actions";
import { FeedbackInput } from "../types/index";
import { toast } from "sonner";

// ==========================================
// ✍️ MUTAÇÕES
// ==========================================

export function useFeedbacksMutations() {
  const upsertFeedback = useMutation({
    mutationFn: async ({
      generationId,
      data,
    }: {
      generationId: string;
      data: FeedbackInput;
    }) => {
      const response = await upsertFeedbackAction(generationId, data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      toast.success("Feedback enviado, obrigado!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    upsertFeedback,
  };
}
