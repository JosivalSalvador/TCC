"use client";

import { motion } from "framer-motion";
import { Sparkles, PlayCircle, Gauge, Heart } from "lucide-react";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

const PATTERN_POINTS = [
  { icon: PlayCircle, label: "Abertura" },
  { icon: Gauge, label: "Ritmo" },
  { icon: Heart, label: "Curva emocional" },
];

export function GenerationEmpty() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="glass-panel relative flex flex-col items-center justify-center overflow-hidden rounded-xl px-6 py-20 text-center"
    >
      {/* Brilho decorativo de fundo */}
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b to-transparent"
      />

      <motion.div
        variants={blurFadeIn}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: smoothEase }}
        className="badge-ai glow-primary relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
      >
        <Sparkles className="h-7 w-7" />
      </motion.div>

      <motion.h3
        variants={blurFadeIn}
        className="text-gradient text-xl font-bold"
      >
        O padrão já existe. A gente só extrai.
      </motion.h3>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground relative mt-2 max-w-sm text-sm leading-relaxed"
      >
        A IA analisa os vídeos que já viralizaram no seu nicho e identifica como
        abrem, o ritmo da fala e a curva emocional. Escolha um nicho pra receber
        um guia baseado nesse padrão, não em achismo.
      </motion.p>

      {/* Pontos do padrão analisado */}
      <motion.div
        variants={staggerItem}
        className="border-border/50 relative mt-7 flex items-center gap-6 border-t pt-6"
      >
        {PATTERN_POINTS.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: 0.15 + i * 0.1,
              ease: smoothEase,
            }}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="bg-muted/60 text-primary flex h-9 w-9 items-center justify-center rounded-full">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
              {label}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
