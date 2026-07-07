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

      {/* Atividade recente + Nichos */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-3" />
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
      </div>

      {/* CTA */}
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
