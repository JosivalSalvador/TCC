"use client";

import { motion } from "framer-motion";
import { useFeedbackStats } from "@/hooks/use-feedbacks";
import { FeedbacksByTypeTable } from "../_components/feedbacks/feedbacks-by-type-table";
import { FeedbacksByNicheTable } from "../_components/feedbacks/feedbacks-by-niche-table";
import { FeedbacksTableSkeleton } from "../_components/feedbacks/feedbacks-table-skeleton";
import { StatCard } from "../_components/stats/stat-card";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { MessageSquare } from "lucide-react";

export default function DashboardFeedbacksPage() {
  const { data, isLoading } = useFeedbackStats();

  const total = data?.total ?? 0;
  const byType = data?.byType ?? [];
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
          <h1 className="text-2xl font-bold tracking-tight">Feedbacks</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe a qualidade das gerações por tipo e por nicho.
          </p>
        </motion.div>

        {/* Stat */}
        <motion.div variants={blurFadeIn} className="grid gap-4 sm:grid-cols-2">
          {isLoading ? (
            <StatCardSkeleton />
          ) : (
            <StatCard
              label="Total de feedbacks"
              value={total}
              icon={MessageSquare}
              description="Avaliações enviadas pelos usuários"
            />
          )}
        </motion.div>

        {/* Tabelas */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? (
            <FeedbacksTableSkeleton />
          ) : (
            <div className="flex flex-col gap-6">
              <FeedbacksByTypeTable byType={byType} />
              <FeedbacksByNicheTable byNiche={byNiche} />
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
