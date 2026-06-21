import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="glass-panel flex flex-col gap-3 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <Skeleton className="h-9 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
