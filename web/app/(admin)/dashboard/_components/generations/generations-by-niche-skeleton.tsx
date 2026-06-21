import { Skeleton } from "@/components/ui/skeleton";

export function GenerationsByNicheSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-6">
      <Skeleton className="mb-6 h-5 w-36" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
