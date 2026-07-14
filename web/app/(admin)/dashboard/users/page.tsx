"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useUsersList, useUserStats } from "@/hooks/use-users";
import { UsersTable, type UserSortKey } from "../_components/users/users-table";
import { UsersTableSkeleton } from "../_components/users/users-table-skeleton";
import { UsersToolbar } from "../_components/users/users-toolbar";
import { UsersRoleChart } from "../_components/users/users-role-chart";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function DashboardUsersPage() {
  const { data, isLoading } = useUsersList();
  const { data: stats, isLoading: loadingStats } = useUserStats();

  const users = useMemo(() => data?.users ?? [], [data?.users]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState<UserSortKey>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSortChange = (key: UserSortKey) => {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = users.filter((user) => {
      const matchesSearch =
        term.length === 0 ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case "name":
          comparison = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "email":
          comparison = a.email.localeCompare(b.email, "pt-BR");
          break;
        case "role":
          comparison = a.role.localeCompare(b.role, "pt-BR");
          break;
        case "createdAt":
          comparison =
            (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
            (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [users, search, roleFilter, sortKey, sortDirection]);

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

        {/* Busca e filtro */}
        <motion.div variants={blurFadeIn}>
          <UsersToolbar
            search={search}
            onSearchChange={setSearch}
            roleFilter={roleFilter}
            onRoleFilterChange={setRoleFilter}
            resultCount={filteredUsers.length}
            totalCount={users.length}
            disabled={isLoading}
          />
        </motion.div>

        {/* Tabela */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? (
            <UsersTableSkeleton />
          ) : (
            <UsersTable
              users={filteredUsers}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
            />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
