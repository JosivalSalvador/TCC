"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useFeedbacksMutations } from "@/hooks/use-feedbacks";
import { FeedbackType } from "@/types/enums";
import { cn } from "@/lib/utils/utils";

interface FeedbackButtonsProps {
  generationId: string;
  type: FeedbackType;
}

export function FeedbackButtons({ generationId, type }: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const { upsertFeedback } = useFeedbacksMutations();

  const handleFeedback = (isUseful: boolean) => {
    setSelected(isUseful);
    upsertFeedback.mutate({
      generationId,
      data: { type, isUseful },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs">
        {type === FeedbackType.STRUCTURE ? "Estrutura útil?" : "Roteiro útil?"}
      </span>

      <button
        onClick={() => handleFeedback(true)}
        disabled={upsertFeedback.isPending}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          selected === true
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Sim
      </button>

      <button
        onClick={() => handleFeedback(false)}
        disabled={upsertFeedback.isPending}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          selected === false
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : "border-border/50 text-muted-foreground hover:border-destructive/30 hover:text-foreground",
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        Não
      </button>
    </div>
  );
}
