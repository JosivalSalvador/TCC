import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      {/* Boas vindas */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>

      {/* CTA */}
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
