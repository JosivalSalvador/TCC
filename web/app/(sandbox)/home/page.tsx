"use client";

import { motion } from "framer-motion";
import { useMemo, useSyncExternalStore } from "react";
import { useProfile } from "@/hooks/use-users";
import { useGenerations } from "@/hooks/use-generations";
import { useMyNiches } from "@/hooks/use-niches";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import {
  Sparkles,
  ScrollText,
  Star,
  FolderOpen,
  ArrowRight,
  Clock,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { GenerationResponse, NicheResponse } from "@/types/index";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

// ==========================================
// Helpers de formatação (sem libs externas de data)
// ==========================================

function timeAgo(value: Date | string | undefined) {
  if (!value) return "sem data";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `há ${diffDay} dias`;

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatNicheName(name: string) {
  // Nichos são salvos em snake_case (ex: "receitas_fitness")
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ==========================================
// Hook: sabe se já passou da hidratação
// ==========================================

// getSnapshot() só é chamado no client, e ali o React já garantiu que a
// árvore hidratada bate com o HTML do server (senão o mismatch já teria
// disparado antes disso). getServerSnapshot() é o valor usado durante
// SSR e durante o próprio passe de hidratação — por isso os dois nunca
// colidem, sem precisar de setState num effect.
function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function useIsHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// ==========================================
// Sub-componentes
// ==========================================

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof Sparkles;
  href: string;
  accent: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-panel glow-border group relative flex flex-col gap-4 overflow-hidden rounded-xl p-5"
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full opacity-[0.08] blur-[50px] transition-opacity duration-300 group-hover:opacity-[0.14]"
        style={{ background: accent }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{
            background: `linear-gradient(135deg, ${accent}25, ${accent}10)`,
            border: `1px solid ${accent}30`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <span className="relative z-10 font-mono text-3xl font-bold tabular-nums">
        {value}
      </span>
      <Link
        href={href}
        className="relative z-10 flex items-center gap-1 text-xs font-medium text-[#9995b0] transition-colors group-hover:text-[#c4b5fd]"
      >
        Ver todos
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

function RecentGenerationRow({
  generation,
}: {
  generation: GenerationResponse;
}) {
  return (
    <Link
      href="/history"
      className="group flex items-center gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-white/3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#ff6b5e]/15 to-[#8b5cf6]/15 ring-1 ring-white/5">
        <ScrollText className="h-4 w-4 text-[#c4b5fd]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-[#f0f0f8]">
          {formatNicheName(generation.nicheRequested)}
        </span>
        <span className="text-xs text-[#8b8ba8]">
          {timeAgo(generation.createdAt)}
          {generation.fallbackUsed ? " · nicho alternativo" : ""}
        </span>
      </div>
      {generation.isFavorite && (
        <Star className="h-3.5 w-3.5 shrink-0 fill-[#facc15] text-[#facc15]" />
      )}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#5f5b78] opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="badge-ai flex h-10 w-10 items-center justify-center rounded-full">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[#f0f0f8]">{title}</p>
        <p className="max-w-xs text-xs text-[#8b8ba8]">{description}</p>
      </div>
      <Link
        href={ctaHref}
        className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}

function NicheBar({
  niche,
  count,
  maxCount,
}: {
  niche: NicheResponse;
  count: number;
  maxCount: number;
}) {
  const widthPercent = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#f0f0f8]">
          {formatNicheName(niche.name)}
        </span>
        <span className="font-mono text-[#8b8ba8]">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPercent}%` }}
          transition={{ duration: 0.6, ease: smoothEase }}
          className="h-full rounded-full bg-linear-to-r from-[#ff6b5e] to-[#8b5cf6]"
        />
      </div>
    </div>
  );
}

// ==========================================
// Página
// ==========================================

export default function HomePage() {
  const isHydrated = useIsHydrated();

  const { data: profileData } = useProfile();
  const { data: generationsData } = useGenerations();
  const { data: favoritesData } = useGenerations({ favorite: true });
  const { data: nichesData } = useMyNiches();

  const user = profileData?.user;
  const generations = useMemo(
    () => generationsData?.generations ?? [],
    [generationsData],
  );
  const niches = useMemo(() => nichesData?.niches ?? [], [nichesData]);

  const totalGenerations = generations.length;
  const totalFavorites = favoritesData?.generations.length ?? 0;
  const totalNiches = niches.length;

  // Últimas 5 gerações, mais recentes primeiro (sem data vai pro fim).
  // createdAt chega como string ISO crua do JSON (o zod só tipa via
  // z.infer no client, não coage em runtime), por isso o new Date() aqui.
  const recentGenerations = useMemo(() => {
    return [...generations]
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }, [generations]);

  // Contagem de gerações por nicho vinculado, calculada no client
  // (sem depender de endpoint de stats, que é exclusivo pra admin)
  const generationsPerNiche = useMemo(() => {
    const counts = new Map<string, number>();
    for (const generation of generations) {
      counts.set(generation.nicheId, (counts.get(generation.nicheId) ?? 0) + 1);
    }
    return niches
      .map((niche) => ({ niche, count: counts.get(niche.id) ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [generations, niches]);

  const maxNicheCount = generationsPerNiche[0]?.count ?? 0;

  const stats = [
    {
      label: "Gerações",
      value: totalGenerations,
      icon: ScrollText,
      href: "/history",
      accent: "#8b5cf6",
    },
    {
      label: "Favoritos",
      value: totalFavorites,
      icon: Star,
      href: "/favorites",
      accent: "#facc15",
    },
    {
      label: "Nichos",
      value: totalNiches,
      icon: FolderOpen,
      href: "/niches",
      accent: "#ff6b5e",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Boas vindas */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Olá, {isHydrated ? (user?.name?.split(" ")[0] ?? "criador") : "..."}{" "}
            👋
          </h1>
          <p className="text-muted-foreground text-sm">
            Pronto para criar conteúdo viral hoje?
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </motion.div>

        {/* Atividade recente + Nichos, lado a lado no desktop */}
        <motion.div
          variants={staggerContainer}
          className="grid gap-4 lg:grid-cols-5"
        >
          {/* Atividade recente — ocupa mais espaço */}
          <motion.div
            variants={blurFadeIn}
            className="glass-panel flex flex-col gap-1 rounded-xl p-5 lg:col-span-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#8b8ba8]" />
                <h2 className="text-sm font-semibold">Atividade recente</h2>
              </div>
              {totalGenerations > 0 && (
                <Link
                  href="/history"
                  className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                >
                  Ver histórico
                </Link>
              )}
            </div>

            {recentGenerations.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {recentGenerations.map((generation) => (
                  <RecentGenerationRow
                    key={generation.id}
                    generation={generation}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ScrollText}
                title="Nenhuma geração ainda"
                description="Suas gerações de estrutura e roteiro vão aparecer aqui assim que você criar a primeira."
                ctaLabel="Gerar conteúdo"
                ctaHref="/generate"
              />
            )}
          </motion.div>

          {/* Nichos com breakdown de atividade */}
          <motion.div
            variants={blurFadeIn}
            className="glass-panel flex flex-col gap-4 rounded-xl p-5 lg:col-span-2"
          >
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-[#8b8ba8]" />
              <h2 className="text-sm font-semibold">Seus nichos</h2>
            </div>

            {generationsPerNiche.length > 0 ? (
              <div className="flex flex-col gap-4">
                {generationsPerNiche.slice(0, 5).map(({ niche, count }) => (
                  <NicheBar
                    key={niche.id}
                    niche={niche}
                    count={count}
                    maxCount={maxNicheCount}
                  />
                ))}
                <Link
                  href="/niches"
                  className="text-primary hover:text-primary/80 mt-1 flex items-center gap-1 text-xs font-medium transition-colors"
                >
                  Gerenciar nichos
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={FolderOpen}
                title="Nenhum nicho vinculado"
                description="Vincule um nicho para começar a gerar conteúdo direcionado ao seu público."
                ctaLabel="Adicionar nicho"
                ctaHref="/niches"
              />
            )}
          </motion.div>
        </motion.div>

        {/* CTA principal */}
        <motion.div
          variants={blurFadeIn}
          className="glass-panel relative overflow-hidden rounded-xl p-8"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#8b5cf6] opacity-10 blur-[60px]" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-[#ff6b5e] opacity-10 blur-[60px]" />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Pronto para gerar?</h2>
              <p className="text-muted-foreground text-sm">
                Escolha um nicho e receba estrutura e roteiro em segundos.
              </p>
            </div>
            <Button asChild className="glow-primary shrink-0">
              <Link href="/generate">
                <Sparkles className="h-4 w-4" />
                Gerar conteúdo
              </Link>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
