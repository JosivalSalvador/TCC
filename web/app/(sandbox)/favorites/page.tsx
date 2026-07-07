"use client";

import { motion } from "framer-motion";
import { useGenerations } from "@/hooks/use-generations";
import { HistoryList } from "../_components/history/history-list";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function FavoritesPage() {
  const { data, isLoading } = useGenerations({ favorite: true });

  const generations = data?.generations ?? [];

  return (
    <div className="mx-auto w-[90%] max-w-5xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 py-10"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-2">
          <h1 className="text-gradient text-3xl font-bold tracking-tight">
            Favoritos
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Suas gerações marcadas como favoritas.
          </p>
        </motion.div>

        {/* Lista */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? null : <HistoryList generations={generations} />}
        </motion.div>
      </motion.div>
    </div>
  );
}
