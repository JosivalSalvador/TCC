"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScrollText } from "lucide-react";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { Button } from "@/components/ui/button";

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
        className="badge-ai mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
      >
        <ScrollText className="h-6 w-6" />
      </motion.div>

      <motion.h3
        variants={blurFadeIn}
        className="text-foreground text-lg font-semibold"
      >
        Nenhuma geração ainda
      </motion.h3>

      <motion.p
        variants={blurFadeIn}
        className="text-muted-foreground mt-2 max-w-xs text-sm leading-relaxed"
      >
        Você ainda não gerou nenhum conteúdo. Comece agora escolhendo um nicho.
      </motion.p>

      <motion.div variants={blurFadeIn} className="mt-6">
        <Button asChild className="glow-primary">
          <Link href="/generate">Gerar conteúdo</Link>
        </Button>
      </motion.div>
    </motion.div>
  );
}
