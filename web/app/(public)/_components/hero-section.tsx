"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, Play, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { hoverScale, tapScale } from "@/lib/animations/fade";

// ==========================================
// Demonstração baseada no output real do pipeline
// para o nicho "esquetes de comédia".
//
// O pipeline nunca devolve um roteiro pronto: devolve
// o padrão encontrado em vídeos que já viralizaram
// (structure_content / script_content). A peça mostra
// isso como anotações sobre um vídeo real, do jeito que
// um editor marcaria com post-its o que funciona nele,
// em vez de simular um "resultado final" com chips de
// hashtag e listas prontas pra copiar.
// ==========================================

const NICHE_LABEL = "esquetes de comédia";
const NICHE_FLAG = "🤣";

type Callout = {
  id: string;
  side: "left" | "right";
  top: string;
  anchorTop: string;
  anchorSide: string;
  label: string;
  detail: string;
};

const CALLOUTS: Callout[] = [
  {
    id: "title",
    side: "left",
    top: "8%",
    anchorTop: "10%",
    anchorSide: "38%",
    label: "título",
    detail: "73 car. · emoji no meio",
  },
  {
    id: "hook",
    side: "right",
    top: "24%",
    anchorTop: "26%",
    anchorSide: "62%",
    label: "gancho",
    detail: "15 palavras · tom neutro",
  },
  {
    id: "rhythm",
    side: "left",
    top: "46%",
    anchorTop: "48%",
    anchorSide: "34%",
    label: "ritmo",
    detail: "1.8 palavras/seg",
  },
  {
    id: "vocab",
    side: "right",
    top: "62%",
    anchorTop: "63%",
    anchorSide: "60%",
    label: "vocabulário",
    detail: "irmã · sogra · vem · olha",
  },
  {
    id: "post-time",
    side: "left",
    top: "82%",
    anchorTop: "84%",
    anchorSide: "40%",
    label: "horário",
    detail: "sex · manhã e tarde",
  },
];

const TYPE_INTERVAL_MS = 60;
const HOLD_AFTER_TYPING_MS = 550;
const SCANNING_DURATION_MS = 1300;
const ANNOTATED_DURATION_MS = 6000;

type Phase = "typing" | "scanning" | "annotated";

/**
 * Digita o texto do nicho caractere a caractere.
 *
 * A "reinicialização" do estado ao trocar de texto NÃO é feita chamando
 * setState no corpo de um efeito (o padrão que gera o aviso de cascading
 * renders). Em vez disso, o componente que usa esse hook é remontado via
 * `key={text}` — o React já entrega `typed` zerado de fábrica, porque é
 * uma instância nova. O único setState dentro do efeito é o do próprio
 * timer (subscription a um relógio externo), que é o caso que a doc do
 * React recomenda.
 */
function useTypewriter(text: string, onDone: () => void) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let i = 0;
    const typing = setInterval(() => {
      i += 1;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(typing);
    }, TYPE_INTERVAL_MS);

    const advance = setTimeout(
      onDone,
      text.length * TYPE_INTERVAL_MS + HOLD_AFTER_TYPING_MS,
    );

    return () => {
      clearInterval(typing);
      clearTimeout(advance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return typed;
}

function TypingHeader({ onDone }: { onDone: () => void }) {
  const typed = useTypewriter(NICHE_LABEL, onDone);
  return (
    <span className="text-sm text-[#f4f2fa]">
      {typed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.6 }}
        className="ml-0.5 inline-block h-[0.9em] w-0.5 translate-y-0.5 bg-[#8b5cf6]"
      />
    </span>
  );
}

/**
 * Ciclo typing -> scanning -> annotated -> typing.
 * Cada fase agenda no máximo um timer de avanço dentro do próprio efeito.
 * A fase "typing" não tem timer aqui: quem avança é o TypingHeader, via
 * onDone, assim que termina de digitar.
 */
function usePhaseCycle() {
  const [phase, setPhase] = useState<Phase>("typing");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (phase === "scanning") {
      const id = setTimeout(() => setPhase("annotated"), SCANNING_DURATION_MS);
      return () => clearTimeout(id);
    }
    if (phase === "annotated") {
      const id = setTimeout(() => {
        setCycle((c) => c + 1);
        setPhase("typing");
      }, ANNOTATED_DURATION_MS);
      return () => clearTimeout(id);
    }
  }, [phase]);

  return { phase, setPhase, cycle };
}

function PhoneMock() {
  return (
    <div className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[1.75rem] bg-linear-to-br from-[#1a1230] via-[#150f24] to-[#0f0f18] p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(255,107,94,0.10),transparent_55%)]" />

      <div className="relative z-10 flex items-center justify-between">
        <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-sm">
          {NICHE_FLAG} shorts
        </span>
        <span className="rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/70 backdrop-blur-sm">
          0:14
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
          <Play className="h-5 w-5 translate-x-0.5 fill-white text-white" />
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          <motion.div
            className="h-full rounded-full bg-white/70"
            initial={{ width: "0%" }}
            animate={{ width: "64%" }}
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}

function AnnotatedPhone() {
  const { phase, setPhase, cycle } = usePhaseCycle();

  return (
    <div className="relative mx-auto flex h-136 w-full max-w-104 items-center justify-center">
      {/* linhas de conexão dos callouts */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 544"
        preserveAspectRatio="none"
      >
        <AnimatePresence>
          {phase === "annotated" &&
            CALLOUTS.map((c, i) => {
              const anchorX = (parseFloat(c.anchorSide) / 100) * 400;
              const anchorY = (parseFloat(c.anchorTop) / 100) * 544;
              const lineX = c.side === "left" ? 92 : 308;
              const lineY = (parseFloat(c.top) / 100) * 544 + 14;
              return (
                <motion.line
                  key={c.id}
                  x1={lineX}
                  y1={lineY}
                  x2={anchorX}
                  y2={anchorY}
                  stroke="#8b5cf6"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
                />
              );
            })}
        </AnimatePresence>
      </svg>

      {/* callouts */}
      <AnimatePresence>
        {phase === "annotated" &&
          CALLOUTS.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{
                opacity: 0,
                scale: 0.85,
                x: c.side === "left" ? 12 : -12,
              }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.12 }}
              className={`absolute z-20 flex w-36 flex-col gap-0.5 rounded-lg border border-[#8b5cf6]/25 bg-[#14101f]/95 px-2.5 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm ${
                c.side === "left" ? "left-0 text-right" : "right-0 text-left"
              }`}
              style={{ top: c.top }}
            >
              <span className="text-[9px] font-semibold tracking-wide text-[#a78bfa] uppercase">
                {c.label}
              </span>
              <span className="text-[10px] leading-snug text-[#c9c6db]">
                {c.detail}
              </span>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* device */}
      <div className="relative z-10 h-full w-54 rounded-[1.75rem] border-4 border-[#22222f] bg-[#0f0f18] shadow-[0_0_70px_rgba(139,92,246,0.18)]">
        <PhoneMock />

        <AnimatePresence>
          {phase === "scanning" && (
            <motion.div
              key="scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 overflow-hidden rounded-3xl"
            >
              <div className="absolute inset-0 bg-black/40" />
              <motion.div
                className="absolute inset-x-0 h-16 bg-linear-to-b from-transparent via-[#8b5cf6]/40 to-transparent"
                initial={{ top: "-10%" }}
                animate={{ top: "110%" }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin text-[#c4b5fd]" />
                <span
                  style={{ fontFamily: "var(--font-mono)" }}
                  className="text-[10px] text-[#c4b5fd]"
                >
                  lendo o padrão
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "typing" && (
            <motion.div
              key={`typing-${cycle}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-[#0f0f18]/92 px-4 text-center backdrop-blur-sm"
            >
              <span className="text-[10px] tracking-widest text-[#5a5a72] uppercase">
                nicho
              </span>
              <TypingHeader onDone={() => setPhase("scanning")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==========================================
// Hero Section
// ==========================================

export function HeroSection() {
  return (
    <section className="bg-grid-subtle relative flex min-h-screen items-center overflow-hidden py-20">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6] opacity-[0.05] blur-[120px]" />
      <div className="pointer-events-none absolute top-1/4 right-0 h-100 w-100 rounded-full bg-[#ff6b5e] opacity-[0.04] blur-[100px]" />
      <div className="pointer-events-none absolute top-2/3 left-0 h-100 w-100 -translate-x-1/3 rounded-full bg-[#8b5cf6] opacity-[0.035] blur-[110px]" />

      <div className="relative z-10 mx-auto flex w-[90%] max-w-400 flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16 2xl:gap-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 1, 0.35, 1] }}
          className="flex max-w-3xl flex-col gap-6 text-center lg:max-w-none lg:flex-[1.15] lg:text-left"
        >
          <span className="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 px-3.5 py-1 text-xs font-medium text-[#c4b5fd] lg:mx-0">
            <Sparkles className="h-3 w-3" />
            Baseado em padrões reais de vídeos que viralizaram
          </span>

          <h1 className="font-sans text-[3rem] leading-[1.06] font-bold tracking-tight text-[#f4f2fa] md:text-[4.25rem] 2xl:text-8xl">
            Pare de adivinhar.{" "}
            <span className="text-[#8b5cf6]">
              Copie o padrão de quem já viralizou.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[#9995b0] md:text-xl lg:mx-0">
            Escolha o nicho. A IA acha os vídeos que já viralizaram e te mostra
            exatamente o que fizeram funcionar: título, gancho, ritmo,
            vocabulário e horário certo pra postar.
          </p>

          <p className="text-sm text-[#9995b0]/60">
            Grátis para começar · Sem cartão de crédito
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <motion.div whileHover={hoverScale} whileTap={tapScale}>
              <Button
                asChild
                size="lg"
                className="glow-primary w-full border-0 bg-[#8b5cf6] text-white hover:bg-[#8b5cf6]/90 sm:w-auto"
              >
                <Link href="/register">
                  Gerar meu primeiro conteúdo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </motion.div>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="w-full text-[#9995b0] hover:text-[#f4f2fa] sm:w-auto"
            >
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.65,
            delay: 0.15,
            ease: [0.25, 1, 0.35, 1],
          }}
          className="w-full shrink-0 lg:ml-auto lg:w-88 xl:w-[24rem] 2xl:w-108"
        >
          <AnnotatedPhone />
        </motion.div>
      </div>
    </section>
  );
}
