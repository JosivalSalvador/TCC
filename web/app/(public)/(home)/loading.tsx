import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      {/* Hero skeleton */}
      <div className="flex min-h-[90vh] flex-col items-center justify-center gap-6 px-6 py-24">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-16 w-full max-w-2xl" />
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="h-5 w-72" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-36" />
        </div>
      </div>

      {/* How it works skeleton */}
      <div className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
          <Skeleton className="h-8 w-48" />
          <div className="grid w-full gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Features skeleton */}
      <div className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
          <Skeleton className="h-8 w-64" />
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
