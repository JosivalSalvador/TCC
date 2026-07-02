"use client";

import {
  Anchor,
  BookOpen,
  Gauge,
  Heart,
  MousePointerClick,
  Repeat2,
  Volume2,
} from "lucide-react";
import { SectionBlock } from "./result-shared";

// ==========================================
// Tipos internos
// ==========================================

interface ArcoTom {
  instrucao?: string;
}

// ==========================================
// Estrutura
// ==========================================

interface EstruturaSectionProps {
  data: Record<string, unknown>;
}

export function EstruturaSection({ data }: EstruturaSectionProps) {
  const limitePalavras =
    typeof data.limite_palavras === "number" ? data.limite_palavras : null;

  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<BookOpen className="h-3.5 w-3.5" />} title="Estrutura">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
      {limitePalavras !== null && limitePalavras > 0 && (
        <span className="bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-1 text-xs font-medium">
          até {limitePalavras} palavras no roteiro
        </span>
      )}
    </SectionBlock>
  );
}

// ==========================================
// Gancho
// ==========================================

interface GanchoSectionProps {
  data: Record<string, unknown>;
}

export function GanchoSection({ data }: GanchoSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<Anchor className="h-3.5 w-3.5" />} title="Gancho">
      <blockquote className="border-primary/40 text-foreground border-l-2 pl-4 text-sm leading-relaxed">
        {data.instrucao}
      </blockquote>
    </SectionBlock>
  );
}

// ==========================================
// Ritmo
// ==========================================

interface RitmoSectionProps {
  data: Record<string, unknown>;
}

export function RitmoSection({ data }: RitmoSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<Gauge className="h-3.5 w-3.5" />} title="Ritmo">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
    </SectionBlock>
  );
}

// ==========================================
// Arco Emocional
// ==========================================

interface ArcoEmocionalSectionProps {
  data: Record<string, unknown>;
}

export function ArcoEmocionalSection({ data }: ArcoEmocionalSectionProps) {
  const inicio = (data.inicio ?? {}) as ArcoTom;
  const meio = (data.meio ?? {}) as ArcoTom;
  const fim = (data.fim ?? {}) as ArcoTom;

  const partes = [
    { label: "Início", part: inicio },
    { label: "Meio", part: meio },
    { label: "Fim", part: fim },
  ].filter((p) => typeof p.part.instrucao === "string");

  if (partes.length === 0) return null;

  return (
    <SectionBlock
      icon={<Heart className="h-3.5 w-3.5" />}
      title="Arco emocional"
    >
      <div className="relative flex flex-col gap-4 pl-4">
        <div className="bg-border/60 absolute top-1 bottom-1 left-1 w-px" />
        {partes.map(({ label, part }) => (
          <div key={label} className="relative flex flex-col gap-1">
            <div className="bg-primary absolute top-1.5 left-[-1.05rem] h-2 w-2 rounded-full" />
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              {label}
            </span>
            <p className="text-foreground text-sm leading-relaxed">
              {part.instrucao}
            </p>
          </div>
        ))}
      </div>
    </SectionBlock>
  );
}

// ==========================================
// Áudio
// ==========================================

interface AudioSectionProps {
  data: Record<string, unknown>;
}

export function AudioSection({ data }: AudioSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<Volume2 className="h-3.5 w-3.5" />} title="Áudio">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
    </SectionBlock>
  );
}

// ==========================================
// Repetição
// ==========================================

interface RepeticaoSectionProps {
  data: Record<string, unknown>;
}

export function RepeticaoSection({ data }: RepeticaoSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<Repeat2 className="h-3.5 w-3.5" />} title="Repetição">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
    </SectionBlock>
  );
}

// ==========================================
// CTA
// ==========================================

interface CtaSectionProps {
  data: Record<string, unknown>;
}

export function CtaSection({ data }: CtaSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock
      icon={<MousePointerClick className="h-3.5 w-3.5" />}
      title="CTA"
    >
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
    </SectionBlock>
  );
}

// ==========================================
// Vocabulário
// ==========================================

interface VocabularioSectionProps {
  data: Record<string, unknown>;
}

export function VocabularioSection({ data }: VocabularioSectionProps) {
  const termos = Array.isArray(data.termos_recomendados)
    ? (data.termos_recomendados as string[])
    : [];
  const coocorrencias = Array.isArray(data.coocorrencias)
    ? (data.coocorrencias as unknown[][])
    : [];

  if (typeof data.instrucao !== "string" && termos.length === 0) return null;

  return (
    <SectionBlock
      icon={<BookOpen className="h-3.5 w-3.5" />}
      title="Vocabulário"
    >
      {typeof data.instrucao === "string" && (
        <p className="text-foreground text-sm leading-relaxed">
          {data.instrucao}
        </p>
      )}
      {termos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Palavras recomendadas
          </span>
          <div className="flex flex-wrap gap-1.5">
            {termos.map((item, i) => (
              <span
                key={i}
                className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
      {coocorrencias.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Combinações que funcionam juntas
          </span>
          <div className="flex flex-wrap gap-1.5">
            {coocorrencias.map((pair, i) => (
              <span
                key={i}
                className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
              >
                {Array.isArray(pair) ? pair.join(" + ") : String(pair)}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
