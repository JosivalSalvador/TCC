import { Skeleton } from "@/components/ui/skeleton";
import { HistoryDetailSkeleton } from "../../_components/history/history-detail-skeleton";

export default function HistoryDetailLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-56" />
      </div>

      {/* Detalhe */}
      <HistoryDetailSkeleton />
    </div>
  );
}
