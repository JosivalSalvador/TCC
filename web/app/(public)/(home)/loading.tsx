import { Terminal } from "lucide-react";

export default function HomeLoading() {
  return (
    <div className="bg-background flex min-h-screen w-full flex-col">
      {/* 1. SKELETON DO HERO SECTION */}
      <section className="container mx-auto flex flex-col items-start gap-6 px-6 py-24 md:py-32 lg:px-12">
        {/* Badge do topo (Ex: Disponível para trabalho) */}
        <div className="h-8 w-48 animate-pulse rounded-full border border-white/5 bg-white/3" />

        {/* Título Gigante */}
        <div className="mt-4 w-full max-w-4xl space-y-4">
          <div className="h-16 w-full animate-pulse rounded-2xl bg-white/4 md:h-20" />
          <div className="h-16 w-4/5 animate-pulse rounded-2xl bg-white/4 md:h-20" />
        </div>

        {/* Parágrafo de subtítulo */}
        <div className="mt-6 w-full max-w-2xl space-y-2">
          <div className="h-5 w-full animate-pulse rounded-md bg-white/2" />
          <div className="h-5 w-5/6 animate-pulse rounded-md bg-white/2" />
        </div>

        {/* Botões do Hero */}
        <div className="mt-8 flex flex-wrap gap-4">
          <div className="h-12 w-40 animate-pulse rounded-xl bg-white/6" />
          <div className="h-12 w-32 animate-pulse rounded-xl border border-white/5 bg-white/2" />
        </div>
      </section>

      {/* 2. SKELETON DO DIVIDER (Estilo SYS.MODULES) */}
      <div className="flex w-full items-center justify-center px-6 py-8 opacity-40">
        <div className="flex w-full max-w-6xl items-center gap-4">
          <div className="h-px flex-1 animate-pulse bg-[#262626]" />
          <Terminal className="h-4 w-4 animate-pulse text-[#262626]" />
          <div className="h-px flex-1 animate-pulse bg-[#262626]" />
        </div>
      </div>

      {/* 3. SKELETON DO BENTO GRID (Fundação dos sistemas) */}
      <section className="container mx-auto px-6 py-12 lg:px-12">
        {/* Título da Seção */}
        <div className="mb-10 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-white/3" />
          <div className="h-4 w-96 animate-pulse rounded-md bg-white/2" />
        </div>

        {/* O Grid Bento propriamente dito */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card Largo (Frontend/Backend) */}
          <div className="h-70 animate-pulse rounded-3xl border border-white/4 bg-white/2 md:col-span-2" />
          {/* Card Quadrado */}
          <div className="h-70 animate-pulse rounded-3xl border border-white/4 bg-white/2" />
          {/* Card Quadrado */}
          <div className="h-70 animate-pulse rounded-3xl border border-white/4 bg-white/2" />
          {/* Card Largo */}
          <div className="h-70 animate-pulse rounded-3xl border border-white/4 bg-white/2 md:col-span-2" />
        </div>
      </section>
    </div>
  );
}
