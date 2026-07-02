"use client";

import { motion } from "framer-motion";
import { Globe, Layers } from "lucide-react";
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
import {
  TituloSection,
  DescricaoSection,
  ThumbnailSection,
  PalavrasChaveSection,
  PostagemSection,
} from "./result-structure";
import {
  EstruturaSection,
  GanchoSection,
  RitmoSection,
  ArcoEmocionalSection,
  AudioSection,
  RepeticaoSection,
  CtaSection,
  VocabularioSection,
} from "./result-script";

// ==========================================
// Helpers
// ==========================================

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

// ==========================================
// Props
// ==========================================

interface GenerationResultProps {
  generation: GenerationResponse;
}

// ==========================================
// Componente
// ==========================================

export function GenerationResult({ generation }: GenerationResultProps) {
  const sc = asRecord(generation.structureContent) ?? {};
  const script = asRecord(generation.scriptContent) ?? {};

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

      {/* Estrutura do vídeo */}
      <motion.div variants={staggerItem} className="flex flex-col gap-3">
        <h3 className="text-foreground font-semibold">Estrutura do vídeo</h3>
        <div className="flex flex-col gap-3">
          {asRecord(sc.titulo) && <TituloSection data={asRecord(sc.titulo)!} />}
          {asRecord(sc.descricao) && (
            <DescricaoSection data={asRecord(sc.descricao)!} />
          )}
          {asRecord(sc.thumbnail) && (
            <ThumbnailSection data={asRecord(sc.thumbnail)!} />
          )}
          {asRecord(sc.palavras_chave) && (
            <PalavrasChaveSection data={asRecord(sc.palavras_chave)!} />
          )}
          {asRecord(sc.postagem) && (
            <PostagemSection data={asRecord(sc.postagem)!} />
          )}
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
        <div className="flex flex-col gap-3">
          {asRecord(script.estrutura) && (
            <EstruturaSection data={asRecord(script.estrutura)!} />
          )}
          {asRecord(script.gancho) && (
            <GanchoSection data={asRecord(script.gancho)!} />
          )}
          {asRecord(script.ritmo) && (
            <RitmoSection data={asRecord(script.ritmo)!} />
          )}
          {asRecord(script.arco_emocional) && (
            <ArcoEmocionalSection data={asRecord(script.arco_emocional)!} />
          )}
          {asRecord(script.audio) && (
            <AudioSection data={asRecord(script.audio)!} />
          )}
          {asRecord(script.repeticao) && (
            <RepeticaoSection data={asRecord(script.repeticao)!} />
          )}
          {asRecord(script.cta) && <CtaSection data={asRecord(script.cta)!} />}
          {asRecord(script.vocabulario_geral) && (
            <VocabularioSection data={asRecord(script.vocabulario_geral)!} />
          )}
        </div>
        <FeedbackButtons
          generationId={generation.id}
          type={FeedbackType.SCRIPT}
        />
      </motion.div>
    </motion.div>
  );
}
