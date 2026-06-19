"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export function GenerationEmpty() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <motion.div
        variants={blurFadeIn}
        className="badge-ai mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <Sparkles className="h-6 w-6" />
      </motion.div>

      <motion.h3
        variants={blurFadeIn}
        className="text-foreground text-lg font-semibold"
      >
        Pronto para criar
      </motion.h3>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed"
      >
        Escolha um nicho e clique em gerar para receber a estrutura e o roteiro
        do seu próximo vídeo.
      </motion.p>
    </motion.div>
  );
}
