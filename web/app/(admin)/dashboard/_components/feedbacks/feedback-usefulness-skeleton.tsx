import { Skeleton } from "@/components/ui/skeleton";

export function FeedbackUsefulnessSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-6">
      <Skeleton className="mb-2 h-5 w-48" />
      <Skeleton className="mb-6 h-3 w-40" />
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
