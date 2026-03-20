"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GridBackground } from "@/components/ui/grid-background";
import { blurFadeIn, staggerContainer, slideUp } from "@/lib/animations/fade";
import { RefreshCcw, ServerCrash, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log silencioso para debug interno
    console.error("[System Exception]:", error);
  }, [error]);

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
          className="border-destructive/30 bg-destructive/10 mb-6 flex items-center justify-center rounded-full border px-4 py-1.5 backdrop-blur-md"
        >
          <ServerCrash className="text-destructive mr-2 h-4 w-4" />
          <span className="text-destructive font-mono text-xs tracking-widest uppercase">
            Unhandled Exception (500)
          </span>
        </motion.div>

        <motion.h1
          variants={blurFadeIn}
          className="text-5xl font-black tracking-tight md:text-7xl"
        >
          Falha de <span className="text-muted-foreground">Execução.</span>
        </motion.h1>

        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground mt-6 max-w-xl text-sm leading-relaxed font-medium text-balance md:text-base"
        >
          Ocorreu um erro crítico durante a renderização ou processamento de
          dados. O log foi registrado e o time notificado. Você pode tentar
          reiniciar o fluxo.
        </motion.p>

        {/* O painel de vidro que criamos no globals.css */}
        <motion.div
          variants={slideUp}
          className="glass-panel mt-8 w-full max-w-lg rounded-md p-5 text-left"
        >
          <div className="text-muted-foreground font-mono text-xs leading-relaxed">
            <span className="text-primary font-bold">Error Digest:</span>{" "}
            {error.digest || "N/A"}
            <br />
            <span className="text-primary mt-2 inline-block font-bold">
              Message:
            </span>{" "}
            {error.message || "Internal Server Error"}
          </div>
        </motion.div>

        <motion.div
          variants={slideUp}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <button
            onClick={() => reset()}
            className="glow-border group border-border/50 bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 items-center justify-center rounded-md border px-8 text-sm font-medium transition-all"
          >
            <RefreshCcw className="mr-2 h-4 w-4 transition-transform duration-500 group-hover:rotate-180" />
            REINICIAR PROCESSO
          </button>

          <Link
            href="/"
            className="group text-muted-foreground hover:bg-muted/50 hover:text-foreground flex h-11 items-center justify-center rounded-md px-8 text-sm font-medium transition-colors"
          >
            <Home className="mr-2 h-4 w-4" />
            VOLTAR AO INÍCIO
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}
