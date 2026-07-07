import { Skeleton } from "@/components/ui/skeleton";
import { FeedbacksTableSkeleton } from "../_components/feedbacks/feedbacks-table-skeleton";

export default function DashboardFeedbacksLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>

      {/* Tabelas */}
      <FeedbacksTableSkeleton />
    </div>
  );
}
