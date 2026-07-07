"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GenerationForm } from "../_components/generation/generation-form";
import { GenerationResult } from "../_components/generation/generation-result";
import { GenerationEmpty } from "../_components/generation/generation-empty";
import { GenerationSkeleton } from "../_components/generation/generation-skeleton";
import { GenerationResponse } from "@/types/index";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { useGenerationsMutations } from "@/hooks/use-generations";

export default function GeneratePage() {
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const { createGeneration } = useGenerationsMutations();

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-gradient text-3xl font-bold tracking-tight">
              Gerar conteúdo
            </h1>
            <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
              Escolha seu nicho e receba um guia completo de estrutura e roteiro
              para gravar.
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-8">
          {/* Formulário */}
          <motion.div variants={blurFadeIn}>
            <GenerationForm
              onSuccess={(generation) => setResult(generation)}
              createGeneration={createGeneration}
            />
          </motion.div>

          {/* Resultado */}
          <motion.div variants={blurFadeIn}>
            {createGeneration.isPending ? (
              <GenerationSkeleton />
            ) : result ? (
              <GenerationResult generation={result} />
            ) : (
              <GenerationEmpty />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
