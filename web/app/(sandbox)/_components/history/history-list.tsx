"use client";

import { motion } from "framer-motion";
import { GenerationResponse } from "@/types/index";
import { HistoryCard } from "./history-card";
import { HistoryEmpty } from "./history-empty";
import { staggerContainer } from "@/lib/animations/fade";

interface HistoryListProps {
  generations: GenerationResponse[];
}

export function HistoryList({ generations }: HistoryListProps) {
  if (generations.length === 0) {
    return <HistoryEmpty />;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {generations.map((generation) => (
        <HistoryCard key={generation.id} generation={generation} />
      ))}
    </motion.div>
  );
}
