import { Skeleton } from "@/components/ui/skeleton";

export default function FavoritesLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
