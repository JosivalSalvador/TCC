"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GenerationResponse } from "@/types/index";
import { FavoriteButton } from "./favorite-button";
import { Layers, Globe, Clock } from "lucide-react";
import { staggerItem } from "@/lib/animations/fade";

interface HistoryCardProps {
  generation: GenerationResponse;
}

export function HistoryCard({ generation }: HistoryCardProps) {
  const date = generation.createdAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(generation.createdAt))
    : null;

  return (
    <motion.div
      variants={staggerItem}
      className="glass-panel glow-border group relative flex flex-col gap-4 rounded-xl p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-ai inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
            <Layers className="h-3 w-3" />
            {generation.nicheRequested}
          </span>
          {generation.audienceCountry && (
            <span className="badge-ai inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <Globe className="h-3 w-3" />
              {generation.audienceCountry}
            </span>
          )}
        </div>
        <FavoriteButton
          generationId={generation.id}
          isFavorite={generation.isFavorite}
        />
      </div>

      {/* Preview da estrutura */}
      <div className="flex flex-col gap-1">
        {Object.entries(generation.structureContent)
          .slice(0, 2)
          .map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                {key}
              </span>
              <span className="text-foreground line-clamp-1 text-sm">
                {String(value)}
              </span>
            </div>
          ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {date && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {date}
          </span>
        )}
        <Link
          href={`/history/${generation.id}`}
          className="text-primary hover:text-primary/80 ml-auto text-xs font-medium transition-colors"
        >
          Ver completo →
        </Link>
      </div>
    </motion.div>
  );
}
