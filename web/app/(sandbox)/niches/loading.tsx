import { Skeleton } from "@/components/ui/skeleton";

export default function NichesLoading() {
  return (
    <div className="mx-auto w-[90%] max-w-3xl">
      <div className="flex flex-col gap-8 py-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Formulário */}
        <Skeleton className="h-52 w-full rounded-xl" />

        {/* Lista */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
