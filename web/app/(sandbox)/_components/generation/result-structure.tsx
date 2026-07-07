"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  FileText,
  Image as ImageIcon,
  Search,
  Sparkles,
  Type,
  Users,
} from "lucide-react";
import { SectionBlock, ProportionBar } from "./result-shared";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

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

  // Extrai um número de caracteres da instrução, se houver, pra virar
  // uma tag visual separada — sem alterar o texto original da instrução.
  const charMatch = data.instrucao.match(/(\d+)\s*caracter/i);
  const charCount = charMatch ? charMatch[1] : null;

  return (
    <SectionBlock icon={<Type className="h-3.5 w-3.5" />} title="Título">
      <blockquote className="border-primary/40 text-foreground border-l-2 pl-4 text-sm leading-relaxed">
        {data.instrucao}
      </blockquote>
      {charCount && (
        <span className="bg-muted text-muted-foreground w-fit rounded-full px-2.5 py-1 font-mono text-xs">
          ~{charCount} caracteres
        </span>
      )}
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
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.25,
                  delay: i * 0.03,
                  ease: smoothEase,
                }}
                className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
              >
                #{tag}
              </motion.span>
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
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: smoothEase }}
            className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3"
          >
            <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase">
              <Type className="h-3 w-3" />
              Texto da capa
            </span>
            <p className="text-foreground text-sm leading-relaxed">
              {textoCapa}
            </p>
          </motion.div>
        )}
        {cena && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08, ease: smoothEase }}
            className="bg-muted/40 flex flex-col gap-2 rounded-lg p-3"
          >
            <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase">
              <Users className="h-3 w-3" />
              Composição da cena
            </span>
            <p className="text-foreground text-sm leading-relaxed">{cena}</p>
          </motion.div>
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

  const grupoCores = {
    "Short-tail": "#8b5cf6",
    "Mid-tail": "#ff6b5e",
    "Long-tail": "#6366f1",
  };

  const grupos = [
    {
      label: "Short-tail" as const,
      items: shorttail,
      peso: proporcao.shorttail,
    },
    { label: "Mid-tail" as const, items: midtail, peso: proporcao.midtail },
    { label: "Long-tail" as const, items: longtail, peso: proporcao.longtail },
  ].filter((g) => g.items.length > 0);

  const temProporcao = grupos.some((g) => typeof g.peso === "number");

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

      {/* Distribuição ideal, como barras */}
      {temProporcao && (
        <div className="flex flex-col gap-2.5">
          <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
            Distribuição ideal
          </span>
          {grupos
            .filter((g) => typeof g.peso === "number")
            .map((grupo) => (
              <ProportionBar
                key={grupo.label}
                label={grupo.label}
                ratio={grupo.peso as number}
                color={grupoCores[grupo.label]}
              />
            ))}
        </div>
      )}

      {grupos.map((grupo) => {
        const cor = grupoCores[grupo.label];
        return (
          <div key={grupo.label} className="flex flex-col gap-1.5">
            <span className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              {grupo.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {grupo.items.map((item, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.25,
                    delay: i * 0.03,
                    ease: smoothEase,
                  }}
                  className="rounded-md px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: `${cor}1a`,
                    color: cor,
                  }}
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </div>
        );
      })}
    </SectionBlock>
  );
}

// ==========================================
// Postagem
// ==========================================

interface PostagemSectionProps {
  data: Record<string, unknown>;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

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
        <div className="flex flex-col gap-2">
          <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs tracking-wider uppercase">
            <Calendar className="h-3 w-3" />
            Melhores janelas na semana
          </span>
          <div className="flex flex-col gap-2">
            {slots.map((slot, i) => {
              const isMelhorSlot = i === 0;
              const diaIndex = DIAS_SEMANA.findIndex((d) =>
                d.toLowerCase().startsWith(slot.dia.toLowerCase().slice(0, 3)),
              );

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: i * 0.08,
                    ease: smoothEase,
                  }}
                  className={`relative flex items-center gap-3 rounded-lg p-3 ${
                    isMelhorSlot
                      ? "bg-primary/10 ring-primary/30 ring-1"
                      : "bg-muted/40"
                  }`}
                >
                  {isMelhorSlot && (
                    <span className="text-primary absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#12121c]">
                      <Sparkles className="h-3 w-3" />
                    </span>
                  )}

                  {/* Mini-indicador da semana: 7 pontinhos, o dia certo aceso */}
                  <div className="flex shrink-0 gap-0.5">
                    {DIAS_SEMANA.map((_, di) => (
                      <span
                        key={di}
                        className={`h-1.5 w-1.5 rounded-full ${
                          di === diaIndex
                            ? isMelhorSlot
                              ? "bg-primary"
                              : "bg-foreground/60"
                            : "bg-border"
                        }`}
                      />
                    ))}
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="badge-ai inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize">
                        {slot.dia}
                      </span>
                      <span className="text-foreground text-xs font-medium capitalize">
                        {slot.janela}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs leading-relaxed">
                      {slot.justificativa}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </SectionBlock>
  );
}
