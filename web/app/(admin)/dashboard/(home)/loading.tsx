// dashboard/(home)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardSkeleton } from "../_components/stats/stat-card-skeleton";

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
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </div>
  );
}
