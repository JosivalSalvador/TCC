export default function AuthLoading() {
  return (
    <div className="glass-panel w-full animate-pulse flex-col rounded-2xl p-8 shadow-2xl sm:p-10">
      <div className="border-border/50 mb-8 flex flex-col items-start border-b pb-6">
        <div className="bg-muted/40 mb-4 h-3 w-24 rounded-full" />
        <div className="bg-muted/40 h-8 w-48 rounded-md" />
        <div className="bg-muted/20 mt-4 h-4 w-64 rounded-md" />
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="bg-muted/30 h-3 w-16 rounded-full" />
          <div className="bg-muted/20 h-11 w-full rounded-md" />
        </div>
        <div className="space-y-2">
          <div className="bg-muted/30 h-3 w-16 rounded-full" />
          <div className="bg-muted/20 h-11 w-full rounded-md" />
        </div>
        <div className="pt-2">
          <div className="bg-border/40 h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}
