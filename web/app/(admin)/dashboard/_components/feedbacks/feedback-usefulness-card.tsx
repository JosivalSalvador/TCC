"use client";

import { motion } from "framer-motion";
import { blurFadeIn } from "@/lib/animations/fade";

type FeedbackType = "STRUCTURE" | "SCRIPT";

interface FeedbackTypeStat {
  type: FeedbackType;
  count: number;
  usefulCount: number;
  usefulPercent: number;
}

interface FeedbackUsefulnessCardProps {
  byType: FeedbackTypeStat[];
  total: number;
}

const typeLabels: Record<FeedbackType, string> = {
  STRUCTURE: "Estrutura",
  SCRIPT: "Roteiro",
};

export function FeedbackUsefulnessCard({
  byType,
  total,
}: FeedbackUsefulnessCardProps) {
  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <div className="mb-6 flex flex-col gap-1">
        <h3 className="text-foreground font-semibold">
          Taxa de utilidade dos guias
        </h3>
        <p className="text-muted-foreground text-xs">
          Com base em {total} avaliaç{total === 1 ? "ão" : "ões"} enviada
          {total === 1 ? "" : "s"}.
        </p>
      </div>

      {byType.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum feedback registrado ainda.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {byType.map(({ type, count, usefulCount, usefulPercent }) => (
            <div key={type} className="flex flex-col gap-2">
              <span className="text-muted-foreground text-sm">
                {typeLabels[type]}
              </span>
              <span className="text-3xl font-bold">{usefulPercent}%</span>
              <span className="text-muted-foreground text-xs">
                {usefulCount} de {count} avaliaç
                {count === 1 ? "ão útil" : "ões úteis"}
              </span>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${usefulPercent}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                  className="bg-primary/70 h-full rounded-full"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
