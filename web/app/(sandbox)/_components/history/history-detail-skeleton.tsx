import { Skeleton } from "@/components/ui/skeleton";

export function HistoryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <Skeleton className="h-4 w-40" />

      <Skeleton className="h-px w-full" />

      {/* Estrutura */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-36" />
        <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      {/* Roteiro */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-24" />
        <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
