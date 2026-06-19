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
import { FavoriteButton } from "../history/favorite-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Globe, Layers } from "lucide-react";

interface GenerationResultProps {
  generation: GenerationResponse;
}

export function GenerationResult({ generation }: GenerationResultProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={blurFadeIn} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
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
      </motion.div>

      <Separator className="bg-border/50" />

      {/* Estrutura */}
      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        <h3 className="text-foreground font-semibold">Estrutura do vídeo</h3>
        <div className="glass-panel rounded-xl p-6">
          <div className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-3">
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
