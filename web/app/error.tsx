"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { blurFadeIn, staggerContainer, slideUp } from "@/lib/animations/fade";
import { RefreshCcw, AlertTriangle, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Viralize Error]:", error);
  }, [error]);

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
          className="border-destructive/30 bg-destructive/10 mb-6 flex items-center gap-2 rounded-full border px-4 py-1.5"
        >
          <AlertTriangle className="text-destructive h-4 w-4" />
          <span className="text-destructive text-xs font-medium">
            Algo deu errado
          </span>
        </motion.div>

        <motion.h1
          variants={blurFadeIn}
          className="text-4xl font-bold tracking-tight md:text-5xl"
        >
          Erro inesperado
        </motion.h1>

        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground mt-4 text-sm leading-relaxed text-balance"
        >
          Ocorreu um problema ao carregar essa página. Você pode tentar
          novamente ou voltar ao início.
        </motion.p>

        <motion.div
          variants={slideUp}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
        >
          <button
            onClick={() => reset()}
            className="glow-primary bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 items-center gap-2 rounded-md px-6 text-sm font-medium transition-all"
          >
            <RefreshCcw className="h-4 w-4" />
            Tentar novamente
          </button>

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground hover:bg-accent flex h-10 items-center gap-2 rounded-md px-6 text-sm font-medium transition-colors"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
