"use client";

import { motion, AnimatePresence } from "framer-motion";
import { NicheResponse } from "@/types/index";
import { NicheCard } from "./niche-card";
import { NichesEmpty } from "./niches-empty";
import { staggerContainer } from "@/lib/animations/fade";

interface NichesListProps {
  niches: NicheResponse[];
}

export function NichesList({ niches }: NichesListProps) {
  if (niches.length === 0) {
    return <NichesEmpty />;
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      <AnimatePresence mode="popLayout">
        {niches.map((niche) => (
          <NicheCard key={niche.id} niche={niche} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
