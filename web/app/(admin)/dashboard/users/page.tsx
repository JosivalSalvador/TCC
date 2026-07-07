"use client";

import { motion } from "framer-motion";
import { useUsersList, useUserStats } from "@/hooks/use-users";
import { UsersTable } from "../_components/users/users-table";
import { UsersTableSkeleton } from "../_components/users/users-table-skeleton";
import { UsersRoleChart } from "../_components/users/users-role-chart";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function DashboardUsersPage() {
  const { data, isLoading } = useUsersList();
  const { data: stats, isLoading: loadingStats } = useUserStats();

  const users = data?.users ?? [];

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
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os usuários cadastrados no sistema.
          </p>
        </motion.div>

        {/* Chart */}
        <motion.div variants={blurFadeIn}>
          {loadingStats ? (
            <StatCardSkeleton />
          ) : (
            <UsersRoleChart byRole={stats?.byRole ?? []} />
          )}
        </motion.div>

        {/* Tabela */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? <UsersTableSkeleton /> : <UsersTable users={users} />}
        </motion.div>
      </motion.div>
    </div>
  );
}
