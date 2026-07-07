"use client";

import { motion } from "framer-motion";
import { useAllNiches, useNicheStats } from "@/hooks/use-niches";
import { NichesTable } from "../_components/niches/niches-table";
import { NichesTableSkeleton } from "../_components/niches/niches-table-skeleton";
import { NichesGrowthChart } from "../_components/niches/niches-growth-chart";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function DashboardNichesPage() {
  const { data, isLoading } = useAllNiches();
  const { data: statsData, isLoading: loadingStats } = useNicheStats();

  const niches = data?.niches ?? [];
  const monthlyGrowth = statsData?.success
    ? (statsData.data?.monthlyGrowth ?? [])
    : [];

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
          <h1 className="text-2xl font-bold tracking-tight">Nichos</h1>
          <p className="text-muted-foreground text-sm">
            Visualize o pool global de nichos e seu crescimento.
          </p>
        </motion.div>

        {/* Chart */}
        <motion.div variants={blurFadeIn}>
          {loadingStats ? (
            <StatCardSkeleton />
          ) : (
            <NichesGrowthChart monthlyGrowth={monthlyGrowth} />
          )}
        </motion.div>

        {/* Tabela */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? (
            <NichesTableSkeleton />
          ) : (
            <NichesTable niches={niches} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
