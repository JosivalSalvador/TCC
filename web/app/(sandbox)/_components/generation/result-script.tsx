"use client";

import { motion } from "framer-motion";
import {
  Anchor,
  BadgeCheck,
  Gauge,
  Heart,
  ListRestart,
  MousePointerClick,
  MousePointerBan,
  Repeat2,
  ScrollText,
  Volume2,
} from "lucide-react";
import {
  SectionBlock,
  ConnectedPair,
  MeterBar,
  StatusBadge,
  DotCounter,
} from "./result-shared";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

// ==========================================
// Tipos internos
// ==========================================

interface ArcoTom {
  instrucao?: string;
}

const AUDIO_CATEGORIAS: { termo: RegExp; label: string }[] = [
  { termo: /música|trilha/i, label: "Música de fundo" },
  { termo: /risada/i, label: "Risadas" },
  { termo: /grito/i, label: "Gritos/reações" },
  { termo: /efeito sonoro|efeitos sonoros/i, label: "Efeitos sonoros" },
  { termo: /silêncio|discret/i, label: "Discreto" },
];

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
    <SectionBlock
      icon={<ScrollText className="h-3.5 w-3.5" />}
      title="Estrutura"
    >
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
      {limitePalavras !== null && (
        <span className="bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-1 text-xs font-medium">
          {limitePalavras > 0
            ? `até ${limitePalavras} palavras no roteiro`
            : "sem limite de palavras definido"}
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

  const velocidadeMatch = data.instrucao.match(
    /([\d.,]+)\s*palavras?\s*por\s*segundo/i,
  );
  const fraseMatch = data.instrucao.match(
    /([\d.,]+)\s*palavras.{0,20}(?:frase|comprimento)/i,
  );

  const velocidade = velocidadeMatch
    ? parseFloat(velocidadeMatch[1].replace(",", "."))
    : null;
  const comprimentoFrase = fraseMatch ? fraseMatch[1] : null;

  return (
    <SectionBlock icon={<Gauge className="h-3.5 w-3.5" />} title="Ritmo">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>

      {(velocidade !== null || comprimentoFrase) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {velocidade !== null && (
            <MeterBar
              label="Velocidade de fala"
              value={velocidade}
              displayValue={`${velocidade} palavras/s`}
              min={1}
              max={3}
            />
          )}
          {comprimentoFrase && (
            <span className="bg-muted text-muted-foreground w-fit shrink-0 rounded-full px-2.5 py-1 font-mono text-xs">
              ~{comprimentoFrase} palavras/frase
            </span>
          )}
        </div>
      )}
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
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: "100%" }}
          transition={{ duration: 0.8, ease: smoothEase }}
          className="bg-border/60 absolute top-1 left-1 w-px"
        />
        {partes.map(({ label, part }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.25, ease: smoothEase }}
            className="relative flex flex-col gap-1"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 0.3,
                delay: i * 0.25 + 0.1,
                ease: smoothEase,
              }}
              className="bg-primary absolute top-1.5 left-[-1.05rem] h-2 w-2 rounded-full"
            />
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              {label}
            </span>
            <p className="text-foreground text-sm leading-relaxed">
              {part.instrucao}
            </p>
          </motion.div>
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

  const categoriasDetectadas = AUDIO_CATEGORIAS.filter((cat) =>
    cat.termo.test(data.instrucao as string),
  );

  return (
    <SectionBlock icon={<Volume2 className="h-3.5 w-3.5" />} title="Áudio">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
      {categoriasDetectadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categoriasDetectadas.map((cat, i) => (
            <motion.span
              key={cat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: i * 0.05, ease: smoothEase }}
              className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
            >
              <Volume2 className="h-2.5 w-2.5" />
              {cat.label}
            </motion.span>
          ))}
        </div>
      )}
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

  const vezesMatch = data.instrucao.match(/(\d+)\s*vezes/i);
  const vezes = vezesMatch ? parseInt(vezesMatch[1], 10) : null;

  return (
    <SectionBlock icon={<Repeat2 className="h-3.5 w-3.5" />} title="Repetição">
      <p className="text-foreground text-sm leading-relaxed">
        {data.instrucao}
      </p>
      {vezes !== null && (
        <DotCounter
          label="Repetições sugeridas"
          count={vezes}
          color="#8b5cf6"
        />
      )}
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

  const semCtaExplicito =
    /raramente|evite|sem chamada|não utiliza|não pede/i.test(data.instrucao);

  return (
    <SectionBlock
      icon={<MousePointerClick className="h-3.5 w-3.5" />}
      title="CTA"
    >
      <StatusBadge
        active={!semCtaExplicito}
        activeLabel="CTA presente"
        inactiveLabel="Sem CTA explícito"
        activeIcon={<BadgeCheck className="h-3 w-3" />}
        inactiveIcon={<MousePointerBan className="h-3 w-3" />}
      />
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
      icon={<ListRestart className="h-3.5 w-3.5" />}
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
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.02,
                  ease: smoothEase,
                }}
                className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs"
              >
                {item}
              </motion.span>
            ))}
          </div>
        </div>
      )}
      {coocorrencias.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Combinações que funcionam juntas
          </span>
          <div className="flex flex-wrap gap-2">
            {coocorrencias.map((pair, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: i * 0.05,
                  ease: smoothEase,
                }}
              >
                <ConnectedPair
                  terms={
                    Array.isArray(pair) ? pair.map(String) : [String(pair)]
                  }
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
