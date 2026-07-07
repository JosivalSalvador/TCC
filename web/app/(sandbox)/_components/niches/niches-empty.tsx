"use client";

import { motion } from "framer-motion";
import { FolderPlus, Sparkles } from "lucide-react";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export function NichesEmpty() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div variants={blurFadeIn} className="relative mb-5">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="bg-primary/20 absolute inset-0 rounded-2xl blur-xl"
        />
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="badge-ai relative flex h-16 w-16 items-center justify-center rounded-2xl"
        >
          <FolderPlus className="h-7 w-7" />
        </motion.div>

        <motion.div
          animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="text-accent-foreground absolute -top-1 -right-1"
        >
          <Sparkles className="h-4 w-4" />
        </motion.div>
      </motion.div>

      <motion.h3
        variants={blurFadeIn}
        className="text-foreground text-lg font-semibold"
      >
        Nenhum nicho vinculado ainda
      </motion.h3>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed"
      >
        Use o campo acima para pesquisar um nicho já existente ou criar o seu
        próprio, e comece a gerar conteúdo personalizado para o seu canal.
      </motion.p>
    </motion.div>
  );
}
