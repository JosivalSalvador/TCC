"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Layers,
  Clock,
  Eye,
  Mic2,
  SlidersHorizontal,
  Rocket,
  Type,
  ImageIcon,
  Users,
  AlignLeft,
  Hash,
  Tags,
  CalendarClock,
  Frame,
  Music,
  Repeat,
  MessageSquareQuote,
  BookOpenText,
  ChevronDown,
} from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

// ==========================================
// Helpers
// ==========================================

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

type Origin = "structure" | "script";

const ORIGIN_COLOR: Record<Origin, string> = {
  structure: "#7c3aed",
  script: "#ff6b5e",
};

const ORIGIN_LABEL: Record<Origin, string> = {
  structure: "estrutura",
  script: "roteiro",
};

// ==========================================
// FieldTag
// Etiqueta de origem obrigatória em TODO campo individual.
// Nunca depende da cor de fundo do card pai: cada instrução
// carrega sua própria etiqueta "nome do campo · origem",
// porque um mesmo card de fase mistura campos de origens
// diferentes (ex: Isca tem título vindo da Estrutura e
// nada do Roteiro; Alcance mistura Estrutura e Roteiro).
// ==========================================

interface FieldTagProps {
  icon: React.ReactNode;
  label: string;
  origin: Origin;
}

function FieldTag({ icon, label, origin }: FieldTagProps) {
  const color = ORIGIN_COLOR[origin];
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-wider uppercase"
        style={{ color }}
      >
        {icon}
        {label}
      </span>
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {ORIGIN_LABEL[origin]}
      </span>
    </div>
  );
}

// ==========================================
// FieldBlock
// Campo curto: sempre visível, sem colapsar. Rótulo + origem
// no topo, texto completo da instrução embaixo.
// ==========================================

interface FieldBlockProps {
  icon: React.ReactNode;
  label: string;
  origin: Origin;
  text: string;
  emphasis?: boolean;
}

function FieldBlock({ icon, label, origin, text, emphasis }: FieldBlockProps) {
  const color = ORIGIN_COLOR[origin];
  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-4"
      style={{
        backgroundColor: emphasis ? `${color}0d` : undefined,
        border: emphasis ? `1px solid ${color}30` : undefined,
      }}
    >
      <FieldTag icon={icon} label={label} origin={origin} />
      <p className="text-foreground text-sm leading-relaxed">{text}</p>
    </div>
  );
}

// ==========================================
// FieldCollapsible
// Campo longo: colapsado por padrão, expande ao clicar.
// Mesma etiqueta de origem do FieldBlock, mas o texto some
// até o clique. Aberto por padrão só quando defaultOpen=true
// (reservado para o único campo longo que é decisivo: gancho
// já é curto, então na prática isso raramente é usado, mas
// fica disponível caso a instrução real venha maior).
// ==========================================

interface FieldCollapsibleProps {
  icon: React.ReactNode;
  label: string;
  origin: Origin;
  text: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

function FieldCollapsible({
  icon,
  label,
  origin,
  text,
  defaultOpen,
  children,
}: FieldCollapsibleProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  const color = ORIGIN_COLOR[origin];

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="bg-muted/30 rounded-xl p-4"
    >
      <CollapsibleTrigger className="flex w-full flex-col gap-2 text-left">
        <div className="flex items-center justify-between gap-2">
          <span
            className="flex items-center gap-1.5 font-mono text-[10px] font-medium tracking-wider uppercase"
            style={{ color }}
          >
            {icon}
            {label}
          </span>
          <div className="flex items-center gap-2">
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {ORIGIN_LABEL[origin]}
            </span>
            <ChevronDown
              className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-3">
        <p className="text-foreground pt-2 text-sm leading-relaxed">{text}</p>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ==========================================
// MetricCard
// Os únicos três campos numéricos do JSON inteiro
// (limite_palavras, ritmo em palavras/s, quantidade_hashtags)
// ganham cara de número, não de frase.
// ==========================================

interface MetricCardProps {
  label: string;
  value: string;
  unit?: string;
  origin: Origin;
}

function MetricCard({ label, value, unit, origin }: MetricCardProps) {
  const color = ORIGIN_COLOR[origin];
  return (
    <div className="bg-muted/30 flex flex-col gap-1 rounded-xl p-4">
      <span
        className="flex items-center gap-1.5 text-[11px] font-medium"
        style={{ color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label} · {ORIGIN_LABEL[origin]}
      </span>
      <p className="text-foreground text-xl font-semibold">
        {value}
        {unit && (
          <span className="text-muted-foreground ml-1 text-xs font-normal">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

// ==========================================
// ChipList
// Listas do JSON (hashtags, termos, shorttail/midtail/longtail)
// como chips, com origem indicada uma vez no cabeçalho da lista
// inteira (não repetida por chip, pois todos os chips da mesma
// lista têm sempre a mesma origem).
// ==========================================

interface ChipListProps {
  items: string[];
  origin: Origin;
}

function ChipList({ items, origin }: ChipListProps) {
  const color = ORIGIN_COLOR[origin];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={`${item}-${i}`}
          className="rounded-full px-2.5 py-1 text-xs"
          style={{ backgroundColor: `${color}12`, color }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// ==========================================
// PairList
// Coocorrências: pares de palavras, não uma lista comum.
// ==========================================

function PairList({ pairs }: { pairs: string[][] }) {
  if (pairs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {pairs.map((pair, i) => (
        <span
          key={i}
          className="bg-muted/40 text-muted-foreground flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
        >
          {pair[0]}
          <span className="text-muted-foreground/50">+</span>
          {pair[1]}
        </span>
      ))}
    </div>
  );
}

// ==========================================
// ProportionBar
// palavras_chave.proporcao_ideal como barra segmentada,
// com o texto de palavras_chave.instrucao acima (o número
// sozinho não explica a lógica por trás da distribuição).
// ==========================================

interface ProportionBarProps {
  shorttail: number;
  midtail: number;
  longtail: number;
}

function ProportionBar({ shorttail, midtail, longtail }: ProportionBarProps) {
  const toPct = (v: number) => Math.round(v * 100);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2 overflow-hidden rounded-full">
        <div
          className="h-full"
          style={{ width: `${toPct(shorttail)}%`, backgroundColor: "#7c3aed" }}
        />
        <div
          className="h-full"
          style={{ width: `${toPct(midtail)}%`, backgroundColor: "#a78bfa" }}
        />
        <div
          className="h-full"
          style={{ width: `${toPct(longtail)}%`, backgroundColor: "#ddd6fe" }}
        />
      </div>
      <div className="text-muted-foreground flex justify-between text-[11px]">
        <span>shorttail {toPct(shorttail)}%</span>
        <span>midtail {toPct(midtail)}%</span>
        <span>longtail {toPct(longtail)}%</span>
      </div>
    </div>
  );
}

// ==========================================
// PhaseHeader / PhaseCard
// ==========================================

interface PhaseHeaderProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

function PhaseHeader({ icon, label, description, color }: PhaseHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon}
      </span>
      <div className="flex flex-col">
        <h3 className="text-foreground text-base font-semibold">{label}</h3>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
  );
}

interface PhaseCardProps {
  color: string;
  emphasis?: boolean;
  children: React.ReactNode;
}

function PhaseCard({ color, emphasis, children }: PhaseCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{
        borderColor: `${color}40`,
        background: emphasis
          ? `linear-gradient(to bottom right, ${color}0f, transparent)`
          : `${color}08`,
      }}
    >
      {children}
    </motion.div>
  );
}

// ==========================================
// OriginLegend
// Legenda geral no topo da página, explicando o que os dois
// pontos de cor significam antes do usuário ver o primeiro card.
// ==========================================

function OriginLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: ORIGIN_COLOR.structure }}
        />
        Estrutura: como o vídeo é formatado (título, descrição, thumbnail,
        postagem, palavras-chave)
      </span>
      <span className="text-muted-foreground flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: ORIGIN_COLOR.script }}
        />
        Roteiro: o que falar e como falar (gancho, arco emocional, ritmo, áudio,
        CTA, vocabulário)
      </span>
    </div>
  );
}

// ==========================================
// SpeechTimeline
// Fase 2 (Fala): Gancho → Arco Emocional (início/meio/fim) → CTA.
// Todos os campos desta fase são de origem "script", então cada
// ponto da timeline carrega a etiqueta "roteiro" individualmente,
// já que a fase inteira em tese é 100% roteiro, mas a etiqueta
// por campo continua explícita para não depender de o usuário
// lembrar da regra geral da fase.
// ==========================================

interface SpeechTimelineProps {
  ganchoTexto: string | null;
  arcoInicio: string | null;
  arcoMeio: string | null;
  arcoFim: string | null;
  ctaTexto: string | null;
}

function SpeechTimeline({
  ganchoTexto,
  arcoInicio,
  arcoMeio,
  arcoFim,
  ctaTexto,
}: SpeechTimelineProps) {
  if (!ganchoTexto && !arcoInicio && !arcoMeio && !arcoFim && !ctaTexto) {
    return null;
  }

  const steps: { key: string; time: string; label: string; text: string }[] =
    [];
  if (ganchoTexto)
    steps.push({
      key: "gancho",
      time: "0s",
      label: "gancho",
      text: ganchoTexto,
    });
  if (arcoInicio)
    steps.push({ key: "inicio", time: "", label: "início", text: arcoInicio });
  if (arcoMeio)
    steps.push({ key: "meio", time: "", label: "meio", text: arcoMeio });
  if (arcoFim)
    steps.push({ key: "fim", time: "", label: "fim", text: arcoFim });
  if (ctaTexto)
    steps.push({ key: "cta", time: "fim", label: "cta", text: ctaTexto });

  return (
    <div className="relative flex flex-col gap-5 pl-5">
      <motion.div
        initial={{ height: 0 }}
        animate={{ height: "100%" }}
        transition={{ duration: 1, ease: smoothEase }}
        className="bg-border/60 absolute top-1.5 left-1.5 w-px"
      />
      {steps.map((step) => (
        <div key={step.key} className="relative flex flex-col gap-1.5">
          <span
            className="absolute top-1.5 left-[-1.15rem] h-2.5 w-2.5 rounded-full ring-4"
            style={{
              backgroundColor: ORIGIN_COLOR.script,
              boxShadow: `0 0 0 4px ${ORIGIN_COLOR.script}26`,
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase">
              {step.time && `${step.time} · `}
              {step.label}
            </span>
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: `${ORIGIN_COLOR.script}1a`,
                color: ORIGIN_COLOR.script,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: ORIGIN_COLOR.script }}
              />
              roteiro
            </span>
          </div>
          <p
            className="text-foreground border-l-2 pl-3 text-sm leading-relaxed"
            style={{ borderColor: `${ORIGIN_COLOR.script}40` }}
          >
            {step.text}
          </p>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// Props
// ==========================================

interface HistoryDetailProps {
  generation: GenerationResponse;
}

// ==========================================
// Componente
// ==========================================

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

  const sc = asRecord(generation.structureContent) ?? {};
  const script = asRecord(generation.scriptContent) ?? {};

  const titulo = asRecord(sc.titulo);
  const descricao = asRecord(sc.descricao);
  const thumbnail = asRecord(sc.thumbnail);
  const palavrasChave = asRecord(sc.palavras_chave);
  const postagem = asRecord(sc.postagem);

  const estrutura = asRecord(script.estrutura);
  const gancho = asRecord(script.gancho);
  const ritmo = asRecord(script.ritmo);
  const arcoEmocional = asRecord(script.arco_emocional);
  const audio = asRecord(script.audio);
  const repeticao = asRecord(script.repeticao);
  const cta = asRecord(script.cta);
  const vocabulario = asRecord(script.vocabulario_geral);

  // ---- Extração individual de cada campo (nenhum campo do JSON fica de fora) ----

  const tituloTexto = asString(titulo?.instrucao);

  const descricaoTexto = asString(descricao?.instrucao);
  const hashtags = asStringArray(descricao?.hashtags);
  const quantidadeHashtags =
    typeof descricao?.quantidade_hashtags === "number"
      ? descricao.quantidade_hashtags
      : hashtags.length || null;

  const textoCapa = asString(thumbnail?.texto_capa_instrucao);
  const cenaTexto = asString(thumbnail?.cena_instrucao);

  const palavrasChaveTexto = asString(palavrasChave?.instrucao);
  const shorttail = asStringArray(palavrasChave?.shorttail);
  const midtail = asStringArray(palavrasChave?.midtail);
  const longtail = asStringArray(palavrasChave?.longtail);
  const proporcao = asRecord(palavrasChave?.proporcao_ideal);
  const proporcaoValida =
    proporcao &&
    typeof proporcao.shorttail === "number" &&
    typeof proporcao.midtail === "number" &&
    typeof proporcao.longtail === "number"
      ? {
          shorttail: proporcao.shorttail as number,
          midtail: proporcao.midtail as number,
          longtail: proporcao.longtail as number,
        }
      : null;

  const postagemTexto = asString(postagem?.instrucao);
  const slotsRaw = Array.isArray(postagem?.slots) ? postagem.slots : [];
  const slots = slotsRaw
    .map((slot) => asRecord(slot))
    .filter((slot): slot is Record<string, unknown> => slot !== null);

  const estruturaTexto = asString(estrutura?.instrucao);
  const limitePalavras =
    typeof estrutura?.limite_palavras === "number"
      ? estrutura.limite_palavras
      : null;

  const ganchoTexto = asString(gancho?.instrucao);

  const ritmoTexto = asString(ritmo?.instrucao);
  const ritmoMatch = ritmoTexto?.match(
    /(\d+([.,]\d+)?)\s*palavras? por segundo/i,
  );
  const ritmoValor = ritmoMatch ? ritmoMatch[1].replace(",", ".") : null;

  const arcoInicio = asString(asRecord(arcoEmocional?.inicio)?.instrucao);
  const arcoMeio = asString(asRecord(arcoEmocional?.meio)?.instrucao);
  const arcoFim = asString(asRecord(arcoEmocional?.fim)?.instrucao);

  const audioTexto = asString(audio?.instrucao);
  const repeticaoTexto = asString(repeticao?.instrucao);
  const ctaTexto = asString(cta?.instrucao);

  const vocabularioTexto = asString(vocabulario?.instrucao);
  const termosRecomendados = asStringArray(vocabulario?.termos_recomendados);
  const coocorrenciasRaw = Array.isArray(vocabulario?.coocorrencias)
    ? vocabulario.coocorrencias
    : [];
  const coocorrencias = coocorrenciasRaw
    .map((pair) => asStringArray(pair))
    .filter((pair) => pair.length === 2);

  const totalSecoes = [
    titulo,
    descricao,
    thumbnail,
    palavrasChave,
    postagem,
    estrutura,
    gancho,
    ritmo,
    arcoEmocional,
    audio,
    repeticao,
    cta,
    vocabulario,
  ].filter(Boolean).length;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-8"
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {date && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3" />
                {date}
              </span>
            )}
            <span className="text-muted-foreground font-mono text-xs">
              {totalSecoes} {totalSecoes === 1 ? "seção" : "seções"} no guia
            </span>
          </div>
        </div>
        <OriginLegend />
      </motion.div>

      <Separator className="bg-border/50" />

      {/* ========================================== */}
      {/* Fase 1: Isca                                  */}
      {/* Título e thumbnail: as instruções que decidem  */}
      {/* o clique. Ambas vêm da Estrutura.              */}
      {/* ========================================== */}
      {(tituloTexto || textoCapa || cenaTexto) && (
        <PhaseCard color="#7c3aed" emphasis>
          <PhaseHeader
            icon={<Eye className="h-4 w-4" />}
            label="Isca"
            description="O que decide o clique antes do vídeo começar"
            color="#7c3aed"
          />

          {tituloTexto && (
            <FieldBlock
              icon={<Type className="h-3 w-3" />}
              label="título"
              origin="structure"
              text={tituloTexto}
              emphasis
            />
          )}

          {(textoCapa || cenaTexto) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {textoCapa && (
                <FieldBlock
                  icon={<ImageIcon className="h-3 w-3" />}
                  label="texto da capa"
                  origin="structure"
                  text={textoCapa}
                />
              )}
              {cenaTexto && (
                <FieldBlock
                  icon={<Users className="h-3 w-3" />}
                  label="composição da cena"
                  origin="structure"
                  text={cenaTexto}
                />
              )}
            </div>
          )}
        </PhaseCard>
      )}

      {/* ========================================== */}
      {/* Fase 2: Fala                                  */}
      {/* Gancho → arco emocional → CTA: tudo roteiro.  */}
      {/* ========================================== */}
      {(ganchoTexto || arcoInicio || arcoMeio || arcoFim || ctaTexto) && (
        <PhaseCard color="#ff6b5e">
          <PhaseHeader
            icon={<Mic2 className="h-4 w-4" />}
            label="Fala"
            description="A timeline do que é dito, do início ao fim"
            color="#ff6b5e"
          />
          <SpeechTimeline
            ganchoTexto={ganchoTexto}
            arcoInicio={arcoInicio}
            arcoMeio={arcoMeio}
            arcoFim={arcoFim}
            ctaTexto={ctaTexto}
          />
        </PhaseCard>
      )}

      {/* ========================================== */}
      {/* Fase 3: Direção                                */}
      {/* Parâmetros técnicos de gravação: tudo roteiro. */}
      {/* ========================================== */}
      {(estruturaTexto ||
        limitePalavras !== null ||
        ritmoTexto ||
        audioTexto ||
        repeticaoTexto) && (
        <PhaseCard color="#6366f1">
          <PhaseHeader
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="Direção"
            description="Os parâmetros técnicos de como gravar"
            color="#6366f1"
          />

          {(limitePalavras !== null || ritmoValor) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {limitePalavras !== null && (
                <MetricCard
                  label="limite de palavras"
                  value={
                    limitePalavras === 0 ? "Sem limite" : String(limitePalavras)
                  }
                  origin="script"
                />
              )}
              {ritmoValor && (
                <MetricCard
                  label="ritmo de fala"
                  value={ritmoValor}
                  unit="palavras/s"
                  origin="script"
                />
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {estruturaTexto && (
              <FieldCollapsible
                icon={<Frame className="h-3 w-3" />}
                label="estrutura do vídeo"
                origin="script"
                text={estruturaTexto}
              />
            )}
            {ritmoTexto && (
              <FieldCollapsible
                icon={<SlidersHorizontal className="h-3 w-3" />}
                label="ritmo (detalhe)"
                origin="script"
                text={ritmoTexto}
              />
            )}
            {audioTexto && (
              <FieldCollapsible
                icon={<Music className="h-3 w-3" />}
                label="áudio"
                origin="script"
                text={audioTexto}
              />
            )}
            {repeticaoTexto && (
              <FieldCollapsible
                icon={<Repeat className="h-3 w-3" />}
                label="repetição"
                origin="script"
                text={repeticaoTexto}
              />
            )}
          </div>
        </PhaseCard>
      )}

      {/* ========================================== */}
      {/* Fase 4: Alcance                                */}
      {/* Como o vídeo é encontrado depois de pronto:    */}
      {/* mistura Estrutura (descrição, palavras-chave,  */}
      {/* postagem) e Roteiro (vocabulário): por isso     */}
      {/* cada campo aqui carrega sua própria etiqueta.   */}
      {/* ========================================== */}
      {(descricaoTexto ||
        hashtags.length > 0 ||
        palavrasChaveTexto ||
        postagemTexto ||
        vocabularioTexto) && (
        <PhaseCard color="#10b981">
          <PhaseHeader
            icon={<Rocket className="h-4 w-4" />}
            label="Alcance"
            description="Como o vídeo é encontrado depois de pronto"
            color="#10b981"
          />

          {(descricaoTexto || hashtags.length > 0) && (
            <FieldCollapsible
              icon={<AlignLeft className="h-3 w-3" />}
              label="descrição"
              origin="structure"
              text={descricaoTexto ?? ""}
            >
              {hashtags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Hash className="h-3 w-3" />
                    {quantidadeHashtags ?? hashtags.length} hashtags sugeridas
                  </span>
                  <ChipList items={hashtags} origin="structure" />
                </div>
              )}
            </FieldCollapsible>
          )}

          {(palavrasChaveTexto || proporcaoValida) && (
            <FieldCollapsible
              icon={<Tags className="h-3 w-3" />}
              label="palavras-chave"
              origin="structure"
              text={palavrasChaveTexto ?? ""}
            >
              {proporcaoValida && (
                <ProportionBar
                  shorttail={proporcaoValida.shorttail}
                  midtail={proporcaoValida.midtail}
                  longtail={proporcaoValida.longtail}
                />
              )}
              {shorttail.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    shorttail
                  </span>
                  <ChipList items={shorttail} origin="structure" />
                </div>
              )}
              {midtail.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    midtail
                  </span>
                  <ChipList items={midtail} origin="structure" />
                </div>
              )}
              {longtail.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    longtail
                  </span>
                  <ChipList items={longtail} origin="structure" />
                </div>
              )}
            </FieldCollapsible>
          )}

          {(postagemTexto || slots.length > 0) && (
            <FieldCollapsible
              icon={<CalendarClock className="h-3 w-3" />}
              label="postagem"
              origin="structure"
              text={postagemTexto ?? ""}
            >
              {slots.length > 0 && (
                <div className="flex flex-col gap-2">
                  {slots.map((slot, i) => {
                    const dia = asString(slot.dia);
                    const janela = asString(slot.janela);
                    const justificativa = asString(slot.justificativa);
                    if (!dia && !janela) return null;
                    return (
                      <div
                        key={i}
                        className="bg-background/40 flex flex-col gap-0.5 rounded-lg px-3 py-2"
                      >
                        <span className="text-foreground text-xs font-medium">
                          {dia}
                          {janela && ` · ${janela}`}
                        </span>
                        {justificativa && (
                          <span className="text-muted-foreground text-[11px]">
                            {justificativa}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </FieldCollapsible>
          )}

          {(vocabularioTexto ||
            termosRecomendados.length > 0 ||
            coocorrencias.length > 0) && (
            <FieldCollapsible
              icon={<BookOpenText className="h-3 w-3" />}
              label="vocabulário geral"
              origin="script"
              text={vocabularioTexto ?? ""}
            >
              {termosRecomendados.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground text-[11px]">
                    termos recomendados
                  </span>
                  <ChipList items={termosRecomendados} origin="script" />
                </div>
              )}
              {coocorrencias.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <MessageSquareQuote className="h-3 w-3" />
                    coocorrências
                  </span>
                  <PairList pairs={coocorrencias} />
                </div>
              )}
            </FieldCollapsible>
          )}
        </PhaseCard>
      )}

      <Separator className="bg-border/50" />

      {/* ========================================== */}
      {/* Feedback: uma vez só, no fim do guia inteiro  */}
      {/* ========================================== */}
      <motion.div
        variants={staggerItem}
        className="glass-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <FeedbackButtons
          generationId={generation.id}
          type={FeedbackType.STRUCTURE}
        />
        <FeedbackButtons
          generationId={generation.id}
          type={FeedbackType.SCRIPT}
        />
      </motion.div>
    </motion.div>
  );
}
