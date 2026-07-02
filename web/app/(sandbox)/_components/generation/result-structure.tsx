"use client";

import { Clock, FileText, ImageIcon, Search, Type } from "lucide-react";
import { SectionBlock } from "./result-shared";

// ==========================================
// Tipos internos
// ==========================================

interface PostagemSlot {
  dia: string;
  janela: string;
  justificativa: string;
}

interface ProporcaoIdeal {
  shorttail?: number;
  midtail?: number;
  longtail?: number;
}

// ==========================================
// Titulo
// ==========================================

interface TituloSectionProps {
  data: Record<string, unknown>;
}

export function TituloSection({ data }: TituloSectionProps) {
  if (typeof data.instrucao !== "string") return null;

  return (
    <SectionBlock icon={<Type className="h-3.5 w-3.5" />} title="Título">
      <blockquote className="border-primary/40 text-foreground border-l-2 pl-4 text-sm leading-relaxed">
        {data.instrucao}
      </blockquote>
    </SectionBlock>
  );
}

// ==========================================
// Descricao
// ==========================================

interface DescricaoSectionProps {
  data: Record<string, unknown>;
}

export function DescricaoSection({ data }: DescricaoSectionProps) {
  const hashtags = Array.isArray(data.hashtags)
    ? (data.hashtags as string[])
    : [];
  const quantidade =
    typeof data.quantidade_hashtags === "number"
      ? data.quantidade_hashtags
      : null;

  return (
    <SectionBlock icon={<FileText className="h-3.5 w-3.5" />} title="Descrição">
      {typeof data.instrucao === "string" && (
        <p className="text-foreground text-sm leading-relaxed">
          {data.instrucao}
        </p>
      )}
      {hashtags.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Hashtags sugeridas
            </span>
            {quantidade !== null && (
              <span className="text-muted-foreground text-xs">
                {quantidade} recomendadas
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hashtags.map((tag, i) => (
              <span
                key={i}
                className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionBlock>
  );
}

// ==========================================
// Thumbnail
// ==========================================

interface ThumbnailSectionProps {
  data: Record<string, unknown>;
}

export function ThumbnailSection({ data }: ThumbnailSectionProps) {
  const textoCapa =
    typeof data.texto_capa_instrucao === "string"
      ? data.texto_capa_instrucao
      : null;
  const cena =
    typeof data.cena_instrucao === "string" ? data.cena_instrucao : null;

  if (!textoCapa && !cena) return null;

  return (
    <SectionBlock
      icon={<ImageIcon className="h-3.5 w-3.5" />}
      title="Thumbnail"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {textoCapa && (
          <div className="bg-muted/40 flex flex-col gap-1 rounded-lg p-3">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Texto da capa
            </span>
            <p className="text-foreground text-sm leading-relaxed">
              {textoCapa}
            </p>
          </div>
        )}
        {cena && (
          <div className="bg-muted/40 flex flex-col gap-1 rounded-lg p-3">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Composição da cena
            </span>
            <p className="text-foreground text-sm leading-relaxed">{cena}</p>
          </div>
        )}
      </div>
    </SectionBlock>
  );
}

// ==========================================
// Palavras-chave
// ==========================================

interface PalavrasChaveSectionProps {
  data: Record<string, unknown>;
}

export function PalavrasChaveSection({ data }: PalavrasChaveSectionProps) {
  const shorttail = Array.isArray(data.shorttail)
    ? (data.shorttail as string[])
    : [];
  const midtail = Array.isArray(data.midtail) ? (data.midtail as string[]) : [];
  const longtail = Array.isArray(data.longtail)
    ? (data.longtail as string[])
    : [];
  const proporcao = (data.proporcao_ideal ?? {}) as ProporcaoIdeal;

  const grupos = [
    { label: "Short-tail", items: shorttail, peso: proporcao.shorttail },
    { label: "Mid-tail", items: midtail, peso: proporcao.midtail },
    { label: "Long-tail", items: longtail, peso: proporcao.longtail },
  ].filter((g) => g.items.length > 0);

  return (
    <SectionBlock
      icon={<Search className="h-3.5 w-3.5" />}
      title="Palavras-chave"
    >
      {typeof data.instrucao === "string" && (
        <p className="text-foreground text-sm leading-relaxed">
          {data.instrucao}
        </p>
      )}
      {grupos.map((grupo) => (
        <div key={grupo.label} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              {grupo.label}
            </span>
            {typeof grupo.peso === "number" && (
              <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                {Math.round(grupo.peso * 100)}%
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {grupo.items.map((item, i) => (
              <span
                key={i}
                className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </SectionBlock>
  );
}

// ==========================================
// Postagem
// ==========================================

interface PostagemSectionProps {
  data: Record<string, unknown>;
}

export function PostagemSection({ data }: PostagemSectionProps) {
  const slots = Array.isArray(data.slots) ? (data.slots as PostagemSlot[]) : [];

  return (
    <SectionBlock icon={<Clock className="h-3.5 w-3.5" />} title="Postagem">
      {typeof data.instrucao === "string" && (
        <p className="text-foreground text-sm leading-relaxed">
          {data.instrucao}
        </p>
      )}
      {slots.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          {slots.map((slot, i) => (
            <div
              key={i}
              className="bg-muted/40 flex flex-col gap-1 rounded-lg p-3"
            >
              <span className="badge-ai inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize">
                {slot.dia}
              </span>
              <span className="text-foreground text-xs font-medium capitalize">
                {slot.janela}
              </span>
              <span className="text-muted-foreground text-xs leading-relaxed">
                {slot.justificativa}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
}
