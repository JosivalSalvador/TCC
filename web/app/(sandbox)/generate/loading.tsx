import { Skeleton } from "@/components/ui/skeleton";

export default function GenerateLoading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Formulário */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Resultado */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
            <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
