import { Skeleton } from "@/components/ui/skeleton";

export function GenerationSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header do resultado */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-3/4" />
      </div>

      {/* Bloco de estrutura */}
      <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Bloco de roteiro */}
      <div className="glass-panel flex flex-col gap-4 rounded-xl p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Botões de feedback */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
