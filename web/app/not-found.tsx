"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GridBackground } from "@/components/ui/grid-background";
import { blurFadeIn, staggerContainer, slideUp } from "@/lib/animations/fade";
import { ArrowLeft, Terminal } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <main className="bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <GridBackground />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex w-full max-w-3xl flex-col items-center px-6 text-center"
      >
        <motion.div
          variants={blurFadeIn}
          className="border-border/50 bg-muted/30 mb-6 flex items-center justify-center rounded-full border px-4 py-1.5 backdrop-blur-md"
        >
          <Terminal className="text-muted-foreground mr-2 h-4 w-4" />
          <span className="text-muted-foreground font-mono text-xs tracking-widest uppercase">
            Status Code: 404
          </span>
        </motion.div>

        <motion.h1
          variants={blurFadeIn}
          className="text-5xl font-black tracking-tight md:text-7xl"
        >
          Recurso <span className="text-muted-foreground">Inexistente.</span>
        </motion.h1>

        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground mt-6 max-w-xl text-sm leading-relaxed font-medium text-balance md:text-base"
        >
          A rota solicitada não foi encontrada na árvore de diretórios. O
          arquivo pode ter sido movido, renomeado ou o caminho foi digitado
          incorretamente.
        </motion.p>

        <motion.div
          variants={slideUp}
          className="mt-10 flex items-center gap-4"
        >
          <Link
            href="/"
            className="glow-border group border-border/50 bg-card text-foreground hover:bg-muted/50 flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium transition-all"
          >
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            RETORNAR À BASE
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
