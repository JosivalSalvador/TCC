import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";
import { UsersRoleSkeleton } from "../_components/users/users-role-skeleton";
import { GenerationsByNicheSkeleton } from "../_components/generations/generations-by-niche-skeleton";
import { FeedbackUsefulnessSkeleton } from "../_components/feedbacks/feedback-usefulness-skeleton";

export default function DashboardHomeLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Taxa de utilidade */}
      <FeedbackUsefulnessSkeleton />

      {/* Usuários por cargo + Gerações por nicho */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UsersRoleSkeleton />
        <GenerationsByNicheSkeleton />
      </div>

      {/* Crescimento mensal de nichos */}
      <StatCardSkeleton />
    </div>
  );
}
