"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollText, Sparkles } from "lucide-react";
import {
  blurFadeIn,
  staggerContainer,
  hoverScale,
  tapScale,
} from "@/lib/animations/fade";
import { Button } from "@/components/ui/button";

const ICON_COLOR = "#7c3aed";

// ==========================================
// Componente
// Espelha o vocabulário visual do HistoryDetail: ícone em card
// colorido (mesma receita do PhaseHeader), badge com Sparkles no
// topo e microinterações consistentes com o resto do fluxo.
// ==========================================

export function HistoryEmpty() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <motion.div
        variants={blurFadeIn}
        whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${ICON_COLOR}1a`, color: ICON_COLOR }}
      >
        <ScrollText className="h-7 w-7" />
      </motion.div>

      <motion.span
        variants={blurFadeIn}
        className="text-primary mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Seu histórico de guias
      </motion.span>

      <motion.h3
        variants={blurFadeIn}
        className="text-foreground text-xl font-bold tracking-tight"
      >
        Nenhuma geração ainda
      </motion.h3>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed"
      >
        Você ainda não gerou nenhum conteúdo. Comece agora escolhendo um nicho e
        receba seu primeiro guia em segundos.
      </motion.p>

      <motion.div
        variants={blurFadeIn}
        whileHover={hoverScale}
        whileTap={tapScale}
        className="mt-6"
      >
        <Button asChild className="glow-primary">
          <Link href="/generate">Gerar conteúdo</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
