import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// FieldBlockSkeleton
// Espelha FieldBlock: etiqueta de origem (ícone + rótulo + pill)
// no topo, texto corrido embaixo. Usado na Isca (campos curtos,
// sempre visíveis, sem colapsar).
// ==========================================

function FieldBlockSkeleton({
  emphasis,
  lines = 2,
}: {
  emphasis?: boolean;
  lines?: number;
}) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl p-4 ${
        emphasis ? "bg-primary/5" : "bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3.5 ${i === lines - 1 ? "w-3/5" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// FieldCollapsibleSkeleton
// Espelha FieldCollapsible fechado: mesma etiqueta de origem do
// FieldBlock, mas com chevron à direita e sem corpo visível
// (o corpo real só aparece após o clique, então o skeleton não
// finge um corpo que não vai estar lá no primeiro paint).
// ==========================================

function FieldCollapsibleSkeleton() {
  return (
    <div className="bg-muted/30 flex flex-col gap-2 rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MetricCardSkeleton
// Espelha MetricCard: rótulo pequeno com dot de origem em cima,
// número grande embaixo. Usado na Direção (limite de palavras,
// ritmo de fala).
// ==========================================

function MetricCardSkeleton() {
  return (
    <div className="bg-muted/30 flex flex-col gap-2 rounded-xl p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-14" />
    </div>
  );
}

// ==========================================
// TimelineStepSkeleton
// Espelha um ponto da SpeechTimeline: dot posicionado na linha
// vertical, rótulo pequeno + pill de origem, texto com borda
// lateral colorida embaixo.
// ==========================================

function TimelineStepSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="bg-muted-foreground/20 absolute top-1.5 left-[-1.15rem] h-2.5 w-2.5 rounded-full" />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <div className="border-border/60 flex flex-col gap-1.5 border-l-2 pl-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-3.5 ${i === lines - 1 ? "w-3/5" : "w-full"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// PhaseCardSkeleton
// Espelha PhaseCard + PhaseHeader: ícone quadrado colorido,
// título + descrição ao lado, corpo livre por fase (children).
// ==========================================

function PhaseCardSkeleton({
  color,
  emphasis,
  children,
}: {
  color: string;
  emphasis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{
        borderColor: `${color}40`,
        background: emphasis
          ? `linear-gradient(to bottom right, ${color}0f, transparent)`
          : `${color}08`,
      }}
    >
      <div className="flex items-center gap-3">
        <Skeleton
          className="h-9 w-9 shrink-0 rounded-xl"
          style={{ backgroundColor: `${color}1a` }}
        />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      {children}
    </div>
  );
}

// ==========================================
// Componente
// Espelha o HistoryDetail real: header + legenda de origem +
// 4 PhaseCards empilhados numa coluna só (Isca, Fala, Direção,
// Alcance), cada um com a forma interna real da fase, não um
// bloco genérico repetido: a Fala é timeline, a Direção tem
// metric cards, a Isca e a Alcance têm blocos/collapsibles.
// ==========================================

export function HistoryDetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>

      <Skeleton className="h-px w-full" />

      {/* Fase 1: Isca */}
      <PhaseCardSkeleton color="#7c3aed" emphasis>
        <FieldBlockSkeleton emphasis lines={3} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldBlockSkeleton lines={2} />
          <FieldBlockSkeleton lines={2} />
        </div>
      </PhaseCardSkeleton>

      {/* Fase 2: Fala (timeline) */}
      <PhaseCardSkeleton color="#ff6b5e">
        <div className="relative flex flex-col gap-5 pl-5">
          <span className="bg-border/60 absolute top-1.5 left-1.5 h-full w-px" />
          <TimelineStepSkeleton lines={2} />
          <TimelineStepSkeleton lines={2} />
          <TimelineStepSkeleton lines={2} />
          <TimelineStepSkeleton lines={2} />
          <TimelineStepSkeleton lines={2} />
        </div>
      </PhaseCardSkeleton>

      {/* Fase 3: Direção */}
      <PhaseCardSkeleton color="#6366f1">
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="flex flex-col gap-3">
          <FieldCollapsibleSkeleton />
          <FieldCollapsibleSkeleton />
          <FieldCollapsibleSkeleton />
          <FieldCollapsibleSkeleton />
        </div>
      </PhaseCardSkeleton>

      {/* Fase 4: Alcance */}
      <PhaseCardSkeleton color="#10b981">
        <FieldCollapsibleSkeleton />
        <FieldCollapsibleSkeleton />
        <FieldCollapsibleSkeleton />
        <FieldCollapsibleSkeleton />
      </PhaseCardSkeleton>

      <Skeleton className="h-px w-full" />

      {/* Feedback */}
      <div className="glass-panel flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
