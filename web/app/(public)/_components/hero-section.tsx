"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Clock, Hash, FileText, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// ==========================================
// Simulação de output real da IA
// O criador precisa VER o que vai receber.
// ==========================================

const NICHES = [
  {
    niche: "finanças pessoais",
    flag: "🇧🇷",
    output: {
      title: "Você gasta R$300/mês sem perceber (veja onde)",
      hook: "A maioria das pessoas não sabe que esse gasto invisível existe...",
      hashtags: ["#financaspessoais", "#dinheiro", "#economizar", "#shorts"],
      postTime: "Ter · 19h",
      duration: "52s",
    },
  },
  {
    niche: "receitas fitness",
    flag: "🇧🇷",
    output: {
      title: "3 ovos + 1 ingrediente = 40g de proteína em 5 min",
      hook: "Esse café da manhã mudou meu shape sem precisar de suplemento...",
      hashtags: ["#receitafit", "#proteina", "#fitness", "#shorts"],
      postTime: "Seg · 07h",
      duration: "45s",
    },
  },
  {
    niche: "produtividade",
    flag: "🇧🇷",
    output: {
      title: "O método que eliminou minha procrastinação em 3 dias",
      hook: "Eu tentei tudo. Pomodoro, GTD, bullet journal. Nada funcionou até...",
      hashtags: ["#produtividade", "#focoo", "#rotina", "#shorts"],
      postTime: "Qua · 12h",
      duration: "58s",
    },
  },
] as const;

const PHASES = ["input", "generating", "output"] as const;
type Phase = (typeof PHASES)[number];

function OutputCard() {
  const [nicheIndex, setNicheIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("input");

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;

    if (phase === "input") {
      t = setTimeout(() => setPhase("generating"), 1800);
    } else if (phase === "generating") {
      t = setTimeout(() => setPhase("output"), 1400);
    } else {
      // fica no output por 4s, depois troca de nicho
      t = setTimeout(() => {
        setNicheIndex((i) => (i + 1) % NICHES.length);
        setPhase("input");
      }, 4000);
    }

    return () => clearTimeout(t);
  }, [phase]);

  const current = NICHES[nicheIndex];

  return (
    <div className="relative w-full max-w-105 rounded-2xl border border-[#2a2a3d] bg-[#0d0d14] shadow-[0_0_60px_rgba(124,58,237,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e30] px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2a2a3d]" />
            <span className="h-2 w-2 rounded-full bg-[#2a2a3d]" />
            <span className="h-2 w-2 rounded-full bg-[#2a2a3d]" />
          </div>
          <span className="ml-1 font-mono text-[11px] text-[#4a4a6a]">
            nicho.app
          </span>
        </div>
        <AnimatePresence mode="wait">
          {phase === "generating" ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]"
              />
              <span className="font-mono text-[10px] text-[#7c3aed]">
                analisando virais...
              </span>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${phase === "output" ? "bg-[#10b981]" : "bg-[#2a2a3d]"}`}
              />
              <span className="font-mono text-[10px] text-[#4a4a6a]">
                {phase === "output" ? "pronto" : "aguardando"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Body */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {/* FASE: Input */}
          {phase === "input" && (
            <motion.div
              key={`input-${nicheIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <p className="text-xs font-medium tracking-widest text-[#4a4a6a] uppercase">
                nova geração
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-[#8b8ba8]">Nicho</label>
                <div className="flex items-center gap-2 rounded-lg border border-[#2a2a3d] bg-[#12121c] px-3 py-2.5">
                  <span className="text-sm">{current.flag}</span>
                  <span className="text-sm text-[#f0f0f8]">
                    {current.niche}
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                      className="ml-0.5 inline-block h-[0.9em] w-0.5 translate-y-0.5 bg-[#7c3aed]"
                    />
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] text-[#8b8ba8]">Público</label>
                <div className="flex items-center gap-2 rounded-lg border border-[#2a2a3d] bg-[#12121c] px-3 py-2.5">
                  <span className="text-sm text-[#f0f0f8]">Brasil</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* FASE: Generating */}
          {phase === "generating" && (
            <motion.div
              key="generating-body"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-3 py-4"
            >
              {[
                "Cruzando padrões de virais do nicho...",
                "Analisando títulos de maior CTR...",
                "Montando estrutura e roteiro...",
              ].map((text, i) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.35 }}
                  className="flex items-center gap-2.5"
                >
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{
                      repeat: Infinity,
                      duration: 1,
                      delay: i * 0.2,
                    }}
                    className="h-1 w-1 rounded-full bg-[#7c3aed]"
                  />
                  <span className="font-mono text-xs text-[#8b8ba8]">
                    {text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* FASE: Output */}
          {phase === "output" && (
            <motion.div
              key={`output-${nicheIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              {/* Título */}
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-[#7c3aed] uppercase">
                  <Zap className="h-3 w-3" />
                  Título
                </span>
                <p className="text-sm leading-snug font-medium text-[#f0f0f8]">
                  {current.output.title}
                </p>
              </div>

              {/* Hook */}
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-[#8b8ba8] uppercase">
                  <FileText className="h-3 w-3" />
                  Hook do roteiro
                </span>
                <p className="text-xs leading-relaxed text-[#8b8ba8]">
                  {current.output.hook}
                </p>
              </div>

              {/* Linha divisória */}
              <div className="h-px bg-[#1e1e30]" />

              {/* Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-[#4a4a6a]">
                  <Clock className="h-3 w-3" />
                  <span>Postar: {current.output.postTime}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#4a4a6a]">
                  <span>{current.output.duration} ideal</span>
                </div>
              </div>

              {/* Hashtags */}
              <div className="flex flex-wrap gap-1.5">
                {current.output.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 rounded-md bg-[#7c3aed]/10 px-2 py-0.5 text-[11px] text-[#a78bfa]"
                  >
                    <Hash className="h-2.5 w-2.5" />
                    {tag.replace("#", "")}
                  </span>
                ))}
              </div>
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
    <section className="relative flex min-h-screen items-center overflow-hidden px-6 py-20">
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-150 w-150 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c3aed] opacity-[0.04] blur-[120px]" />
      <div className="pointer-events-none absolute top-1/4 right-0 h-100 w-100 rounded-full bg-[#6366f1] opacity-[0.05] blur-[100px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
        {/* ── Texto ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 1, 0.35, 1] }}
          className="flex max-w-xl flex-col gap-6 text-center lg:text-left"
        >
          <span className="badge-ai mx-auto inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1 text-xs font-medium lg:mx-0">
            ✦ Para criadores de YouTube Shorts
          </span>

          <h1 className="text-[2.75rem] leading-[1.08] font-bold tracking-tight md:text-6xl">
            Título, hashtags e roteiro{" "}
            <span className="text-gradient">
              baseados nos virais do seu nicho
            </span>
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed md:text-lg">
            A IA analisa o que já bombou no seu nicho e entrega a estrutura
            completa do vídeo — título, hook, hashtags, horário de postagem e
            roteiro — em segundos. Sem achismo, sem travar na tela em branco.
          </p>

          {/* Social proof mínimo */}
          <p className="text-muted-foreground/60 text-sm">
            Grátis para começar · Sem cartão de crédito
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
            <Button asChild size="lg" className="glow-primary w-full sm:w-auto">
              <Link href="/register">
                Gerar meu primeiro conteúdo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="lg"
              className="text-muted-foreground w-full sm:w-auto"
            >
              <Link href="/login">Já tenho conta</Link>
            </Button>
          </div>
        </motion.div>

        {/* ── Card de output ── */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.25, 1, 0.35, 1] }}
          className="w-full lg:ml-auto lg:max-w-105"
        >
          <OutputCard />
        </motion.div>
      </div>
    </section>
  );
}
