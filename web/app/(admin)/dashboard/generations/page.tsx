"use client";

import { motion } from "framer-motion";
import { useGenerationStats } from "@/hooks/use-generations";
import { GenerationsByNicheChart } from "../_components/generations/generations-by-niche-chart";
import { GenerationsByNicheSkeleton } from "../_components/generations/generations-by-niche-skeleton";
import { StatCard } from "../_components/stats/stat-card";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { Sparkles } from "lucide-react";

export default function DashboardGenerationsPage() {
  const { data, isLoading } = useGenerationStats();

  const totalGenerations = data?.totalGenerations ?? 0;
  const byNiche = data?.byNiche ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Gerações</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe o volume de conteúdos gerados por nicho.
          </p>
        </motion.div>

        {/* Stat */}
        <motion.div variants={blurFadeIn} className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Total de gerações"
              value={totalGenerations}
              icon={Sparkles}
              description="Conteúdos gerados no sistema"
            />
          )}
        </motion.div>

        {/* Chart */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? (
            <GenerationsByNicheSkeleton />
          ) : (
            <GenerationsByNicheChart byNiche={byNiche} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
