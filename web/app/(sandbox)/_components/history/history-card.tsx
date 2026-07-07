"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe,
  Clock,
  ArrowRight,
  Type,
  Mic2,
  Eye,
  SlidersHorizontal,
  Rocket,
  Sparkles,
  Check,
} from "lucide-react";
import { GenerationResponse } from "@/types/index";
import { FavoriteButton } from "./favorite-button";
import { staggerItem, tapScale } from "@/lib/animations/fade";
import { Badge } from "@/components/ui/badge";

// ==========================================
// Helpers
// ==========================================

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function hasContent(value: Record<string, unknown> | null): boolean {
  return value !== null && Object.keys(value).length > 0;
}

type Origin = "structure" | "script";

const ORIGIN_COLOR: Record<Origin, string> = {
  structure: "#7c3aed",
  script: "#ff6b5e",
};

// ==========================================
// PhaseField
// Um campo dentro de uma fase, já com sua origem real (a mesma
// classificação do HistoryDetail: script.estrutura é roteiro
// apesar do nome, vocabulario_geral é roteiro dentro da fase
// Alcance mesmo ela sendo majoritariamente estrutura, etc).
// ==========================================

interface PhaseField {
  label: string;
  origin: Origin;
  present: boolean;
}

// ==========================================
// PhaseChip
// Preview de uma fase do HistoryDetail: ícone + nome da fase na
// cor própria dela, e embaixo a lista real dos campos que a
// compõem — cada um na cor da SUA origem (não a cor da fase),
// exatamente como o comentário do HistoryDetail exige para a
// fase Alcance ("cada campo aqui carrega sua própria etiqueta").
// Campo ausente aparece riscado/apagado, não some da lista —
// assim dá pra ver o que falta, não só o que existe.
// ==========================================

interface PhaseChipProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  fields: PhaseField[];
}

function PhaseChip({ label, color, icon, fields }: PhaseChipProps) {
  const filledCount = fields.filter((f) => f.present).length;
  const active = filledCount > 0;

  return (
    <div
      className="flex flex-1 flex-col gap-2.5 rounded-xl p-3"
      style={{
        backgroundColor: active ? `${color}0d` : undefined,
        border: `1px solid ${active ? `${color}30` : "transparent"}`,
        opacity: active ? 1 : 0.45,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          {icon}
        </span>
        <span
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color: active ? color : undefined }}
        >
          {label}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {fields.map((field) => (
          <div key={field.label} className="flex items-center gap-1.5">
            {field.present ? (
              <Check
                className="h-2.5 w-2.5 shrink-0"
                style={{ color: ORIGIN_COLOR[field.origin] }}
              />
            ) : (
              <span className="text-muted-foreground/40 h-2.5 w-2.5 shrink-0 text-center text-[9px] leading-none">
                –
              </span>
            )}
            <span
              className={`text-[10px] leading-tight ${
                field.present ? "" : "text-muted-foreground/50 line-through"
              }`}
              style={
                field.present
                  ? { color: ORIGIN_COLOR[field.origin] }
                  : undefined
              }
            >
              {field.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Props
// ==========================================

interface HistoryCardProps {
  generation: GenerationResponse;
}

// ==========================================
// Componente
// Card ampliado: dá um preview real das 4 fases do HistoryDetail
// (Isca/Fala/Direção/Alcance), campo por campo, cada campo com a
// cor da SUA origem (não a cor da fase) — igual o HistoryDetail
// faz na fase Alcance, que mistura estrutura e roteiro.
// ==========================================

export function HistoryCard({ generation }: HistoryCardProps) {
  const date = generation.createdAt
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(generation.createdAt))
    : null;

  const sc = asRecord(generation.structureContent) ?? {};
  const script = asRecord(generation.scriptContent) ?? {};

  const titulo = asRecord(sc.titulo);
  const thumbnail = asRecord(sc.thumbnail);
  const descricao = asRecord(sc.descricao);
  const palavrasChave = asRecord(sc.palavras_chave);
  const postagem = asRecord(sc.postagem);

  const gancho = asRecord(script.gancho);
  const arcoEmocional = asRecord(script.arco_emocional);
  const cta = asRecord(script.cta);
  const estrutura = asRecord(script.estrutura); // roteiro, apesar do nome
  const ritmo = asRecord(script.ritmo);
  const audio = asRecord(script.audio);
  const repeticao = asRecord(script.repeticao);
  const vocabulario = asRecord(script.vocabulario_geral);

  const ganchoTexto =
    typeof gancho?.instrucao === "string" ? gancho.instrucao : null;
  const tituloTexto =
    typeof titulo?.instrucao === "string" ? titulo.instrucao : null;
  const manchete = ganchoTexto ?? tituloTexto;
  const manchetteOrigin: Origin = ganchoTexto ? "script" : "structure";
  const manchetteColor = ORIGIN_COLOR[manchetteOrigin];

  // Isca — 100% estrutura (título, thumbnail)
  const iscaFields: PhaseField[] = [
    { label: "título", origin: "structure", present: hasContent(titulo) },
    { label: "thumbnail", origin: "structure", present: hasContent(thumbnail) },
  ];

  // Fala — 100% roteiro (gancho, arco emocional, cta)
  const falaFields: PhaseField[] = [
    { label: "gancho", origin: "script", present: hasContent(gancho) },
    {
      label: "arco emocional",
      origin: "script",
      present: hasContent(arcoEmocional),
    },
    { label: "cta", origin: "script", present: hasContent(cta) },
  ];

  // Direção — 100% roteiro (estrutura do vídeo, ritmo, áudio, repetição)
  const direcaoFields: PhaseField[] = [
    { label: "estrutura", origin: "script", present: hasContent(estrutura) },
    { label: "ritmo", origin: "script", present: hasContent(ritmo) },
    { label: "áudio", origin: "script", present: hasContent(audio) },
    { label: "repetição", origin: "script", present: hasContent(repeticao) },
  ];

  // Alcance — mistura real: descrição/palavras-chave/postagem são
  // estrutura, vocabulário geral é roteiro (igual o HistoryDetail)
  const alcanceFields: PhaseField[] = [
    { label: "descrição", origin: "structure", present: hasContent(descricao) },
    {
      label: "palavras-chave",
      origin: "structure",
      present: hasContent(palavrasChave),
    },
    { label: "postagem", origin: "structure", present: hasContent(postagem) },
    {
      label: "vocabulário",
      origin: "script",
      present: hasContent(vocabulario),
    },
  ];

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: [0.25, 1, 0.35, 1] }}
      className="glass-panel glow-border group relative flex flex-col gap-5 rounded-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-ai inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
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

      {/* Manchete — hero do card, fundo na cor de origem, igual o
          FieldBlock com emphasis do HistoryDetail */}
      <div
        className="flex flex-col gap-2.5 rounded-xl p-4"
        style={
          manchete
            ? {
                backgroundColor: `${manchetteColor}0d`,
                border: `1px solid ${manchetteColor}25`,
              }
            : undefined
        }
      >
        {manchete ? (
          <>
            <span
              className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-wider uppercase"
              style={{ color: manchetteColor }}
            >
              {manchetteOrigin === "script" ? (
                <Mic2 className="h-3 w-3" />
              ) : (
                <Type className="h-3 w-3" />
              )}
              {manchetteOrigin === "script" ? "gancho" : "título"}
            </span>
            <blockquote className="text-foreground line-clamp-3 text-base leading-relaxed italic">
              &ldquo;{manchete}&rdquo;
            </blockquote>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Sparkles className="text-muted-foreground h-4 w-4" />
            <p className="text-muted-foreground text-sm leading-relaxed">
              Guia disponível para consulta.
            </p>
          </div>
        )}
      </div>

      {/* Preview das 4 fases — campo por campo, cada um na cor da SUA
          origem (não a cor da fase), igual a regra da fase Alcance
          do HistoryDetail, que mistura estrutura e roteiro */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PhaseChip
          label="Isca"
          color="#7c3aed"
          icon={<Eye className="h-3.5 w-3.5" />}
          fields={iscaFields}
        />
        <PhaseChip
          label="Fala"
          color="#ff6b5e"
          icon={<Mic2 className="h-3.5 w-3.5" />}
          fields={falaFields}
        />
        <PhaseChip
          label="Direção"
          color="#6366f1"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          fields={direcaoFields}
        />
        <PhaseChip
          label="Alcance"
          color="#10b981"
          icon={<Rocket className="h-3.5 w-3.5" />}
          fields={alcanceFields}
        />
      </div>

      {/* Footer */}
      <div className="border-border/50 flex items-center justify-between border-t pt-4">
        {date && (
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3" />
            {date}
          </span>
        )}
        <motion.div whileTap={tapScale} className="ml-auto">
          <Link
            href={`/history/${generation.id}`}
            className="text-primary hover:text-primary/80 flex items-center gap-1.5 text-sm font-medium transition-colors"
          >
            Ver completo
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
