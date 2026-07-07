"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useFeedbacksMutations } from "@/hooks/use-feedbacks";
import { FeedbackType } from "@/types/enums";
import { cn } from "@/lib/utils/utils";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

interface FeedbackButtonsProps {
  generationId: string;
  type: FeedbackType;
}

export function FeedbackButtons({ generationId, type }: FeedbackButtonsProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const { upsertFeedback } = useFeedbacksMutations();

  const hasVoted = selected !== null;
  const isLocked = upsertFeedback.isPending || hasVoted;

  const handleFeedback = (isUseful: boolean) => {
    if (isLocked) return;
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
        disabled={isLocked}
        aria-pressed={selected === true}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed",
          selected === true
            ? "border-transparent bg-[#10b981]/20 text-[#10b981] ring-1 ring-[#10b981]/50"
            : "border-border/50 text-muted-foreground",
          !hasVoted && "hover:text-foreground hover:border-[#10b981]/40",
          hasVoted && selected !== true && "opacity-40",
        )}
        style={
          selected === true
            ? { boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }
            : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {selected === true ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className="flex items-center"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          ) : (
            <motion.span
              key="thumb"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className="flex items-center"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
        Sim
      </button>

      <button
        onClick={() => handleFeedback(false)}
        disabled={isLocked}
        aria-pressed={selected === false}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed",
          selected === false
            ? "bg-destructive/20 text-destructive ring-destructive/50 border-transparent ring-1"
            : "border-border/50 text-muted-foreground",
          !hasVoted && "hover:border-destructive/40 hover:text-foreground",
          hasVoted && selected !== false && "opacity-40",
        )}
        style={
          selected === false
            ? { boxShadow: "0 0 20px rgba(239, 68, 68, 0.3)" }
            : undefined
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          {selected === false ? (
            <motion.span
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className="flex items-center"
            >
              <Check className="h-3.5 w-3.5" />
            </motion.span>
          ) : (
            <motion.span
              key="thumb"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, ease: smoothEase }}
              className="flex items-center"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
        Não
      </button>
    </div>
  );
}
