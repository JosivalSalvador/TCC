export default function SandboxLoading() {
  return (
    <div className="glass-panel border-border/50 w-full max-w-2xl animate-pulse overflow-hidden rounded-3xl border shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      {/* Barra de Status Simulada */}
      <div className="border-border/40 bg-muted/20 flex h-10 w-full items-center gap-2 border-b px-4">
        <div className="bg-muted/40 h-3 w-3 rounded-full" />
        <div className="bg-muted/40 h-3 w-3 rounded-full" />
        <div className="bg-muted/40 h-3 w-3 rounded-full" />
        <div className="bg-muted/30 ml-auto h-3 w-24 rounded-md" />
      </div>

      <div className="flex flex-col items-center p-8 sm:p-12">
        {/* Ícone Central */}
        <div className="bg-muted/20 border-muted/30 mb-6 h-20 w-20 rounded-2xl border" />

        {/* Título e Subtítulo */}
        <div className="bg-muted/40 mb-4 h-8 w-64 rounded-md" />
        <div className="bg-muted/20 mb-2 h-4 w-full max-w-sm rounded-md" />
        <div className="bg-muted/20 mb-10 h-4 w-3/4 max-w-xs rounded-md" />

        {/* Grid dos Cards de Usuário (O Crachá) */}
        <div className="mb-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="bg-muted/10 border-border/30 h-20 w-full rounded-xl border" />
          <div className="bg-muted/10 border-border/30 h-20 w-full rounded-xl border" />
          <div className="bg-muted/10 border-border/30 h-20 w-full rounded-xl border sm:col-span-2" />
        </div>

        {/* Caixa de Log Simulada */}
        <div className="border-border/40 mb-10 h-40 w-full rounded-xl border bg-[#0a0a0a]" />

        {/* Botão de Logout Simulada */}
        <div className="bg-muted/30 h-12 w-full rounded-md" />
      </div>
    </div>
  );
}
