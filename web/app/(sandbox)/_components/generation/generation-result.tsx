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

  // Monta a lista de seções de estrutura já filtrando o que tem dado real,
  // pra poder contar quantas de fato vão aparecer (subdado derivado, não fixo)
  const estruturaSecoes = [
    asRecord(sc.titulo) && (
      <TituloSection key="titulo" data={asRecord(sc.titulo)!} />
    ),
    asRecord(sc.descricao) && (
      <DescricaoSection key="descricao" data={asRecord(sc.descricao)!} />
    ),
    asRecord(sc.thumbnail) && (
      <ThumbnailSection key="thumbnail" data={asRecord(sc.thumbnail)!} />
    ),
    asRecord(sc.palavras_chave) && (
      <PalavrasChaveSection
        key="palavras_chave"
        data={asRecord(sc.palavras_chave)!}
      />
    ),
    asRecord(sc.postagem) && (
      <PostagemSection key="postagem" data={asRecord(sc.postagem)!} />
    ),
  ].filter(Boolean);

  const scriptSecoes = [
    asRecord(script.estrutura) && (
      <EstruturaSection key="estrutura" data={asRecord(script.estrutura)!} />
    ),
    asRecord(script.gancho) && (
      <GanchoSection key="gancho" data={asRecord(script.gancho)!} />
    ),
    asRecord(script.ritmo) && (
      <RitmoSection key="ritmo" data={asRecord(script.ritmo)!} />
    ),
    asRecord(script.arco_emocional) && (
      <ArcoEmocionalSection
        key="arco_emocional"
        data={asRecord(script.arco_emocional)!}
      />
    ),
    asRecord(script.audio) && (
      <AudioSection key="audio" data={asRecord(script.audio)!} />
    ),
    asRecord(script.repeticao) && (
      <RepeticaoSection key="repeticao" data={asRecord(script.repeticao)!} />
    ),
    asRecord(script.cta) && (
      <CtaSection key="cta" data={asRecord(script.cta)!} />
    ),
    asRecord(script.vocabulario_geral) && (
      <VocabularioSection
        key="vocabulario_geral"
        data={asRecord(script.vocabulario_geral)!}
      />
    ),
  ].filter(Boolean);

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

      {/* ========================================== */}
      {/* Duas colunas lado a lado em telas grandes,   */}
      {/* empilhadas em telas pequenas                 */}
      {/* ========================================== */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* Estrutura do vídeo */}
        <motion.div
          variants={staggerItem}
          className="border-primary/20 bg-primary/[0.03] flex flex-col gap-3 rounded-2xl border p-4"
        >
          <div className="flex items-baseline gap-2">
            <span className="bg-primary h-1.5 w-1.5 rounded-full" />
            <h3 className="text-foreground font-semibold">
              Estrutura do vídeo
            </h3>
            <span className="text-muted-foreground font-mono text-xs">
              {estruturaSecoes.length}{" "}
              {estruturaSecoes.length === 1 ? "seção" : "seções"}
            </span>
          </div>
          <div className="flex flex-col gap-3">{estruturaSecoes}</div>
          <FeedbackButtons
            generationId={generation.id}
            type={FeedbackType.STRUCTURE}
          />
        </motion.div>

        {/* Roteiro */}
        <motion.div
          variants={staggerItem}
          className="flex flex-col gap-3 rounded-2xl border border-[#ff6b5e]/20 bg-[#ff6b5e]/3 p-4"
        >
          <div className="flex items-baseline gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b5e]" />
            <h3 className="text-foreground font-semibold">Roteiro</h3>
            <span className="text-muted-foreground font-mono text-xs">
              {scriptSecoes.length}{" "}
              {scriptSecoes.length === 1 ? "seção" : "seções"}
            </span>
          </div>
          <div className="flex flex-col gap-3">{scriptSecoes}</div>
          <FeedbackButtons
            generationId={generation.id}
            type={FeedbackType.SCRIPT}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
