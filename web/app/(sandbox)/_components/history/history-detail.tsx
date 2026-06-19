"use client";

import { motion } from "framer-motion";
import { GenerationResponse } from "@/types/index";
import { FeedbackType } from "@/types/enums";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";
import { FeedbackButtons } from "../feedback/feedback-buttons";
import { FavoriteButton } from "./favorite-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Layers, Clock } from "lucide-react";

interface HistoryDetailProps {
  generation: GenerationResponse;
}

export function HistoryDetail({ generation }: HistoryDetailProps) {
  const date = generation.createdAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(generation.createdAt))
    : null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={blurFadeIn} className="flex flex-col gap-3">
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
            {generation.fallbackUsed && (
              <Badge variant="secondary" className="text-xs">
                Fallback usado
              </Badge>
            )}
          </div>
          <FavoriteButton
            generationId={generation.id}
            isFavorite={generation.isFavorite}
          />
        </div>
        {date && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {date}
          </span>
        )}
      </motion.div>

      <Separator className="bg-border/50" />

      {/* Estrutura */}
      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        <h3 className="text-foreground font-semibold">Estrutura do vídeo</h3>
        <div className="glass-panel rounded-xl p-6">
          <div className="flex flex-col gap-4">
            {Object.entries(generation.structureContent).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  {key}
                </span>
                <span className="text-foreground text-sm leading-relaxed">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <FeedbackButtons
          generationId={generation.id}
          type={FeedbackType.STRUCTURE}
        />
      </motion.div>

      <Separator className="bg-border/50" />

      {/* Roteiro */}
      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        <h3 className="text-foreground font-semibold">Roteiro</h3>
        <div className="glass-panel rounded-xl p-6">
          <div className="flex flex-col gap-4">
            {Object.entries(generation.scriptContent).map(([key, value]) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
                  {key}
                </span>
                <span className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <FeedbackButtons
          generationId={generation.id}
          type={FeedbackType.SCRIPT}
        />
      </motion.div>
    </motion.div>
  );
}
