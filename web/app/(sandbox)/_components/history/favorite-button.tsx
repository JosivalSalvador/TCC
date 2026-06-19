"use client";

import { Star } from "lucide-react";
import { useGenerationsMutations } from "@/hooks/use-generations";
import { cn } from "@/lib/utils/utils";

interface FavoriteButtonProps {
  generationId: string;
  isFavorite: boolean;
}

export function FavoriteButton({
  generationId,
  isFavorite,
}: FavoriteButtonProps) {
  const { updateFavorite } = useGenerationsMutations();

  const handleToggle = () => {
    updateFavorite.mutate({
      id: generationId,
      data: { isFavorite: !isFavorite },
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={updateFavorite.isPending}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
        isFavorite
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
      )}
    >
      <Star className={cn("h-3.5 w-3.5", isFavorite && "fill-primary")} />
      {isFavorite ? "Favoritado" : "Favoritar"}
    </button>
  );
}
