"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { blurFadeIn } from "@/lib/animations/fade";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

// Mensagens genéricas e leves — trocam a cada ~4s pra segurar os ~40s de espera
const LOADING_MESSAGES = [
  "Assistindo a mais vídeos do que qualquer humano deveria...",
  "Anotando o que faz as pessoas pararem de rolar o feed...",
  "Roubando as boas ideias (de forma totalmente legal)...",
  "Testando ganchos até achar um que gruda...",
  "Ajustando o ritmo pra ninguém sentir vontade de pular...",
  "Descobrindo por que certos vídeos grudam na cabeça...",
  "Traduzindo viralização em passo a passo...",
  "Deixando a criatividade um pouco mais orientada a dados...",
  "Juntando os cacos de um guia que funciona...",
  "Quase lá — os últimos ajustes são os que mais importam...",
];

const MESSAGE_INTERVAL_MS = 4000;

// Partículas orbitando o ícone central, cada uma com raio, velocidade e atraso próprios
const ORBIT_PARTICLES = [
  { radius: 56, duration: 5, delay: 0, size: 6, reverse: false },
  { radius: 56, duration: 5, delay: 1.7, size: 5, reverse: false },
  { radius: 56, duration: 5, delay: 3.3, size: 5, reverse: false },
  { radius: 78, duration: 8, delay: 0, size: 4, reverse: true },
  { radius: 78, duration: 8, delay: 4, size: 4, reverse: true },
];

export function GenerationSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass-panel glow-border relative flex flex-col items-center justify-center overflow-hidden rounded-xl px-6 py-24 text-center">
      {/* Brilho de fundo, respirando */}
      <motion.div
        aria-hidden
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: smoothEase }}
        className="from-primary/15 pointer-events-none absolute inset-x-0 top-0 h-64 bg-linear-to-b to-transparent"
      />

      {/* ========================================== */}
      {/* Cena central: ondas + órbita + ícone */}
      {/* ========================================== */}
      <div className="relative mb-8 flex h-40 w-40 items-center justify-center">
        {/* Ondas concêntricas pulsando pra fora */}
        {[0, 1, 2].map((i) => (
          <motion.span
            key={`ring-${i}`}
            aria-hidden
            initial={{ opacity: 0.6, scale: 0.3 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              ease: smoothEase,
              delay: i * 0.85,
            }}
            className="border-primary/40 absolute inset-0 rounded-full border"
          />
        ))}

        {/* Órbita de partículas */}
        {ORBIT_PARTICLES.map((p, i) => (
          <motion.div
            key={`orbit-${i}`}
            aria-hidden
            className="absolute inset-0"
            animate={{ rotate: p.reverse ? -360 : 360 }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "linear",
              delay: p.delay,
            }}
          >
            <span
              className="bg-primary glow-primary absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) translateY(-${p.radius}px)`,
              }}
            />
          </motion.div>
        ))}

        {/* Anel girando lentamente ao redor do ícone */}
        <motion.span
          aria-hidden
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute h-24 w-24 rounded-full border border-dashed border-[#8b5cf6]/30"
        />

        {/* Ícone central */}
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: smoothEase }}
          className="badge-ai glow-primary relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          >
            <LoaderCircle className="h-7 w-7" />
          </motion.div>
        </motion.div>
      </div>

      {/* ========================================== */}
      {/* Mensagem rotativa */}
      {/* ========================================== */}
      <div className="flex h-14 max-w-sm items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            variants={blurFadeIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="text-foreground text-sm leading-relaxed font-medium"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* ========================================== */}
      {/* Pontinhos de progresso indeterminado */}
      {/* ========================================== */}
      <div className="mt-5 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={`dot-${i}`}
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: smoothEase,
              delay: i * 0.2,
            }}
            className="bg-primary h-1.5 w-1.5 rounded-full"
          />
        ))}
      </div>

      {/* Barra de progresso indeterminada */}
      <div className="bg-muted/60 mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full">
        <motion.div
          animate={{ x: ["-100%", "220%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: smoothEase }}
          className="glow-primary bg-primary h-full w-1/3 rounded-full"
        />
      </div>
    </div>
  );
}
