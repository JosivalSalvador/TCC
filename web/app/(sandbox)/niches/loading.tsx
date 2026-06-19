import { Skeleton } from "@/components/ui/skeleton";

export default function NichesLoading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Formulário */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Lista */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
