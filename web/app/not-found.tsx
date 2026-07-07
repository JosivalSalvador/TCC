"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { blurFadeIn, staggerContainer, slideUp } from "@/lib/animations/fade";
import { ArrowLeft, SearchX } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <main className="bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex w-full max-w-lg flex-col items-center text-center"
      >
        <motion.div
          variants={blurFadeIn}
          className="badge-ai mb-6 flex items-center gap-2 rounded-full px-4 py-1.5"
        >
          <SearchX className="h-4 w-4" />
          <span className="text-xs font-medium">Página não encontrada</span>
        </motion.div>

        <motion.h1
          variants={blurFadeIn}
          className="text-4xl font-bold tracking-tight md:text-5xl"
        >
          Essa página <span className="text-gradient">não existe</span>
        </motion.h1>

        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground mt-4 text-sm leading-relaxed text-balance"
        >
          O endereço que você acessou não foi encontrado. Ele pode ter sido
          removido ou o link está incorreto.
        </motion.p>

        <motion.div variants={slideUp} className="mt-8">
          <Link
            href="/"
            className="glow-border border-border/50 bg-card text-foreground hover:bg-accent flex h-10 items-center gap-2 rounded-md border px-6 text-sm font-medium transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao início
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
