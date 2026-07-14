"use client";

import { motion } from "framer-motion";
import { useUserStats } from "@/hooks/use-users";
import { useNicheStats } from "@/hooks/use-niches";
import { useGenerationStats } from "@/hooks/use-generations";
import { useFeedbackStats } from "@/hooks/use-feedbacks";
import { StatCard } from "../_components/stats/stat-card";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { UsersRoleChart } from "../_components/users/users-role-chart";
import { UsersRoleSkeleton } from "../_components/users/users-role-skeleton";
import { GenerationsByNicheChart } from "../_components/generations/generations-by-niche-chart";
import { GenerationsByNicheSkeleton } from "../_components/generations/generations-by-niche-skeleton";
import { NichesGrowthChart } from "../_components/niches/niches-growth-chart";
import { FeedbackUsefulnessCard } from "../_components/feedbacks/feedback-usefulness-card";
import { FeedbackUsefulnessSkeleton } from "../_components/feedbacks/feedback-usefulness-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { Users, FolderOpen, Sparkles, MessageSquare } from "lucide-react";

export default function DashboardHomePage() {
  const { data: userStats, isLoading: loadingUsers } = useUserStats();
  const { data: nicheStatsData, isLoading: loadingNiches } = useNicheStats();
  const { data: generationStats, isLoading: loadingGenerations } =
    useGenerationStats();
  const { data: feedbackStats, isLoading: loadingFeedbacks } =
    useFeedbackStats();

  const isLoading =
    loadingUsers || loadingNiches || loadingGenerations || loadingFeedbacks;

  const totalUsers = userStats?.total ?? 0;
  const byRole = userStats?.byRole ?? [];

  const totalNiches = nicheStatsData?.success
    ? (nicheStatsData.data?.total ?? 0)
    : 0;
  const monthlyGrowth = nicheStatsData?.success
    ? (nicheStatsData.data?.monthlyGrowth ?? [])
    : [];

  const totalGenerations = generationStats?.totalGenerations ?? 0;
  const byNiche = generationStats?.byNiche ?? [];

  const totalFeedbacks = feedbackStats?.total ?? 0;
  const byType = feedbackStats?.byType ?? [];

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
          <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe as métricas gerais do sistema.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Usuários"
                value={totalUsers}
                icon={Users}
                description="Total de usuários cadastrados"
              />
              <StatCard
                label="Nichos"
                value={totalNiches}
                icon={FolderOpen}
                description="Nichos no pool global"
              />
              <StatCard
                label="Gerações"
                value={totalGenerations}
                icon={Sparkles}
                description="Total de conteúdos gerados"
              />
              <StatCard
                label="Feedbacks"
                value={totalFeedbacks}
                icon={MessageSquare}
                description="Total de avaliações enviadas"
              />
            </>
          )}
        </motion.div>

        {/* Taxa de utilidade dos guias */}
        <motion.div variants={blurFadeIn}>
          {loadingFeedbacks ? (
            <FeedbackUsefulnessSkeleton />
          ) : (
            <FeedbackUsefulnessCard byType={byType} total={totalFeedbacks} />
          )}
        </motion.div>

        {/* Usuários por cargo + Gerações por nicho */}
        <motion.div variants={blurFadeIn} className="grid gap-4 lg:grid-cols-2">
          {loadingUsers ? (
            <UsersRoleSkeleton />
          ) : (
            <UsersRoleChart byRole={byRole} />
          )}
          {loadingGenerations ? (
            <GenerationsByNicheSkeleton />
          ) : (
            <GenerationsByNicheChart byNiche={byNiche} />
          )}
        </motion.div>

        {/* Crescimento mensal de nichos */}
        <motion.div variants={blurFadeIn}>
          {loadingNiches ? (
            <StatCardSkeleton />
          ) : (
            <NichesGrowthChart monthlyGrowth={monthlyGrowth} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
