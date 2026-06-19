"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 py-24">
      {/* Grid de fundo */}
      <div className="bg-grid-subtle pointer-events-none absolute inset-0 opacity-60" />

      {/* Glow central */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c3aed] opacity-[0.07] blur-[120px]" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex max-w-3xl flex-col items-center text-center"
      >
        {/* Badge */}
        <motion.div variants={blurFadeIn}>
          <span className="badge-ai mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            Geração de conteúdo com IA
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={blurFadeIn}
          className="text-5xl leading-tight font-bold tracking-tight md:text-6xl lg:text-7xl"
        >
          Do nicho ao <span className="text-gradient">roteiro viral</span> em
          segundos
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground mt-6 max-w-xl text-base leading-relaxed md:text-lg"
        >
          Escolha seu nicho, defina seu público-alvo e receba a estrutura
          completa e o roteiro perfeito para o seu próximo vídeo — baseado nos
          conteúdos mais virais do momento.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={staggerItem}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="glow-primary">
            <Link href="/register">
              Começar grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">Já tenho uma conta</Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
