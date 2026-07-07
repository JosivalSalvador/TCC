import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// PhaseChipSkeleton
// Espelha o PhaseChip do HistoryCard: ícone quadrado colorido +
// rótulo no topo, lista de campos embaixo (dot + linha curta).
// Cor e quantidade de campos por fase são estáticas; só a
// presença de cada campo depende dos dados, então as linhas
// ficam genéricas.
// ==========================================

function PhaseChipSkeleton({
  color,
  fieldCount,
}: {
  color: string;
  fieldCount: number;
}) {
  return (
    <div
      className="flex flex-1 flex-col gap-2.5 rounded-xl p-3"
      style={{ backgroundColor: `${color}08`, border: `1px solid ${color}20` }}
    >
      <div className="flex items-center gap-2">
        <Skeleton
          className="h-6 w-6 shrink-0 rounded-md"
          style={{ backgroundColor: `${color}1a` }}
        />
        <Skeleton className="h-2.5 w-10" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: fieldCount }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="bg-muted-foreground/20 h-2.5 w-2.5 shrink-0 rounded-full" />
            <Skeleton className={`h-2.5 ${i % 2 === 0 ? "w-14" : "w-10"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// HistoryCardSkeleton
// Mesma peça usada em /history/loading.tsx: espelha o HistoryCard
// real (badges + favorito, manchete em bloco, preview das 4
// fases, footer). Duplicada aqui de propósito, mesmo motivo do
// history: primeiro paint da rota, sem componente compartilhado.
// ==========================================

function HistoryCardSkeleton() {
  return (
    <div className="glass-panel flex flex-col gap-5 rounded-2xl p-6">
      {/* Header: badges de nicho/país + favorito */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-7 w-24 shrink-0 rounded-md" />
      </div>

      {/* Manchete */}
      <div className="bg-muted/30 flex flex-col gap-2.5 rounded-xl p-4">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-sm" />
          <Skeleton className="h-2.5 w-14" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      {/* Preview das 4 fases: Isca, Fala, Direção, Alcance */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PhaseChipSkeleton color="#7c3aed" fieldCount={2} />
        <PhaseChipSkeleton color="#ff6b5e" fieldCount={3} />
        <PhaseChipSkeleton color="#6366f1" fieldCount={4} />
        <PhaseChipSkeleton color="#10b981" fieldCount={4} />
      </div>

      {/* Footer */}
      <div className="border-border/50 flex items-center justify-between border-t pt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export default function FavoritesLoading() {
  return (
    <div className="mx-auto flex w-[90%] max-w-5xl flex-col gap-8 py-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <HistoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
