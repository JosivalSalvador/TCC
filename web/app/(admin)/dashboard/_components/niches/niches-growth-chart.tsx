"use client";

import { motion } from "framer-motion";
import { blurFadeIn } from "@/lib/animations/fade";

interface MonthlyGrowth {
  month: string;
  count: number;
}

interface NichesGrowthChartProps {
  monthlyGrowth: MonthlyGrowth[];
}

export function NichesGrowthChart({ monthlyGrowth }: NichesGrowthChartProps) {
  const max = Math.max(...monthlyGrowth.map((m) => m.count), 1);

  return (
    <motion.div
      variants={blurFadeIn}
      initial="hidden"
      animate="visible"
      className="glass-panel rounded-xl p-6"
    >
      <h3 className="text-foreground mb-6 font-semibold">
        Crescimento mensal de nichos
      </h3>

      {monthlyGrowth.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum dado de crescimento disponível.
        </p>
      ) : (
        <div className="flex h-40 items-end gap-2">
          {monthlyGrowth.map(({ month, count }) => {
            const heightPercent = (count / max) * 100;

            return (
              <div
                key={month}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-muted-foreground text-xs font-medium">
                  {count}
                </span>
                <div
                  className="flex w-full items-end"
                  style={{ height: "100px" }}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.6, ease: [0.25, 1, 0.35, 1] }}
                    className="bg-primary/60 hover:bg-primary w-full rounded-t-md transition-colors"
                  />
                </div>
                <span className="text-muted-foreground w-full truncate text-center text-xs">
                  {month}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
