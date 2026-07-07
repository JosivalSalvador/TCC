"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { useGenerationsMutations } from "@/hooks/use-generations";
import { cn } from "@/lib/utils/utils";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

interface FavoriteButtonProps {
  generationId: string;
  isFavorite: boolean;
}

export function FavoriteButton({
  generationId,
  isFavorite,
}: FavoriteButtonProps) {
  const { updateFavorite } = useGenerationsMutations();

  const [awaitedValue, setAwaitedValue] = useState<boolean | null>(null);
  const isConfirming = awaitedValue !== null && awaitedValue !== isFavorite;

  const isLocked = updateFavorite.isPending || isConfirming;

  const handleToggle = () => {
    if (isLocked) return;
    const nextValue = !isFavorite;
    setAwaitedValue(nextValue);
    updateFavorite.mutate(
      { id: generationId, data: { isFavorite: nextValue } },
      {
        onSettled: () => {
          setAwaitedValue(null);
        },
      },
    );
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLocked}
      aria-pressed={isFavorite}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-70",
        isFavorite
          ? "border-transparent bg-[#eab308]/20 text-[#eab308] ring-1 ring-[#eab308]/50"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-[#eab308]/40",
      )}
      style={
        isFavorite
          ? { boxShadow: "0 0 20px rgba(234, 179, 8, 0.35)" }
          : undefined
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isFavorite ? "on" : "off"}
          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.3, ease: smoothEase }}
          className="flex items-center"
        >
          <Star
            className="h-3.5 w-3.5"
            fill={isFavorite ? "currentColor" : "none"}
            strokeWidth={2}
          />
        </motion.span>
      </AnimatePresence>
      {isFavorite ? "Favoritado" : "Favoritar"}
    </button>
  );
}
