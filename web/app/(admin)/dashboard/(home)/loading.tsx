export default function DashboardHomeLoading() {
  return (
    <div className="flex w-full animate-pulse flex-col pb-12">
      {/* Header Skeleton */}
      <div className="border-border/30 mb-10 flex flex-col justify-between gap-6 border-b pb-6 sm:flex-row sm:items-center">
        <div className="space-y-3">
          <div className="bg-muted/40 h-10 w-72 rounded-md" />
          <div className="bg-muted/20 h-5 w-96 max-w-full rounded-md" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="mb-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-muted/10 border-border/30 h-35 rounded-2xl border"
          />
        ))}
      </div>

      {/* Grid Inferior Skeleton (Timeline + Chart) */}
      <div className="grid w-full grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Timeline Skeleton */}
        <div className="bg-muted/10 border-border/30 flex h-100 flex-col rounded-2xl border p-7">
          <div className="bg-muted/20 mb-8 h-6 w-48 rounded-md" />
          <div className="flex-1 space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="bg-muted/20 h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="bg-muted/20 h-4 w-3/4 rounded-md" />
                  <div className="bg-muted/10 h-3 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="bg-muted/10 border-border/30 flex h-100 flex-col rounded-2xl border p-7">
          <div className="mb-8 flex justify-between">
            <div className="bg-muted/20 h-6 w-48 rounded-md" />
            <div className="bg-muted/20 h-6 w-20 rounded-full" />
          </div>
          <div className="flex flex-1 items-end justify-between gap-2 px-4 pb-4">
            {/* Barras fakes crescendo para cima */}
            <div className="bg-muted/20 h-[40%] w-full rounded-t-md" />
            <div className="bg-muted/20 h-[70%] w-full rounded-t-md" />
            <div className="bg-muted/20 h-[30%] w-full rounded-t-md" />
            <div className="bg-muted/20 h-[90%] w-full rounded-t-md" />
            <div className="bg-muted/20 h-[50%] w-full rounded-t-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
