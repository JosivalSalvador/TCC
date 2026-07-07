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

        <div className="flex flex-col gap-8">
          {/* ========================================== */}
          {/* Formulário — espelha as 3 etapas reais       */}
          {/* ========================================== */}
          <div className="glass-panel flex flex-col gap-0 overflow-hidden rounded-xl">
            {/* Indicador de etapas */}
            <div className="flex items-center px-5 pt-5 pb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex flex-1 items-center last:flex-none"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  {i < 2 && <Skeleton className="mx-2 h-px flex-1" />}
                </div>
              ))}
            </div>

            {/* Etapa 1 — Nicho */}
            <div className="border-border/60 flex flex-col gap-3 border-b p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>

            {/* Etapa 2 — Público */}
            <div className="border-border/60 flex flex-col gap-2 border-b p-5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="mt-1 h-20 w-full rounded-lg" />
            </div>

            {/* Etapa 3 — Ação */}
            <div className="flex flex-col gap-4 p-5">
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>

          {/* ========================================== */}
          {/* Resultado — estado vazio (GenerationEmpty)   */}
          {/* ========================================== */}
          <div className="glass-panel flex flex-col items-center gap-5 rounded-xl px-6 py-20">
            <Skeleton className="h-16 w-16 rounded-2xl" />
            <div className="flex flex-col items-center gap-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-80" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="border-border/50 mt-2 flex items-center gap-6 border-t pt-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <Skeleton className="h-2.5 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
