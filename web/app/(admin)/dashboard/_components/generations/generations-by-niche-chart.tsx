"use client";

import { motion } from "framer-motion";
import { blurFadeIn } from "@/lib/animations/fade";

interface GenerationByNiche {
  nicheId: string;
  nicheName: string;
  count: number;
}

interface GenerationsByNicheChartProps {
  byNiche: GenerationByNiche[];
}

export function GenerationsByNicheChart({
  byNiche,
}: GenerationsByNicheChartProps) {
  const total = byNiche.reduce((acc, item) => acc + item.count, 0);
  const sorted = [...byNiche].sort((a, b) => b.count - a.count);

  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <h3 className="text-foreground mb-6 font-semibold">Gerações por nicho</h3>

      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma geração registrada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sorted.map(({ nicheId, nicheName, count }) => {
            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={nicheId} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {nicheName}
                  </span>
                  <span className="text-foreground font-medium">
                    {count}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({percent}%)
                    </span>
                  </span>
                </div>
                <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                    className="bg-primary/70 hover:bg-primary h-full rounded-full transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
