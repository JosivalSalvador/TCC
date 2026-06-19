"use client";

import { motion } from "framer-motion";
import { useProfile } from "@/hooks/use-users";
import { useGenerations } from "@/hooks/use-generations";
import { useMyNiches } from "@/hooks/use-niches";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import { Sparkles, ScrollText, Star, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { data: profileData } = useProfile();
  const { data: generationsData } = useGenerations();
  const { data: favoritesData } = useGenerations({ favorite: true });
  const { data: nichesData } = useMyNiches();

  const user = profileData?.user;
  const totalGenerations = generationsData?.generations.length ?? 0;
  const totalFavorites = favoritesData?.generations.length ?? 0;
  const totalNiches = nichesData?.niches.length ?? 0;

  const stats = [
    {
      label: "Gerações",
      value: totalGenerations,
      icon: ScrollText,
      href: "/history",
    },
    {
      label: "Favoritos",
      value: totalFavorites,
      icon: Star,
      href: "/favorites",
    },
    {
      label: "Nichos",
      value: totalNiches,
      icon: FolderOpen,
      href: "/niches",
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
            Olá, {user?.name?.split(" ")[0] ?? "criador"} 👋
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
          {stats.map(({ label, value, icon: Icon, href }) => (
            <motion.div
              key={label}
              variants={staggerItem}
              className="glass-panel glow-border flex flex-col gap-3 rounded-xl p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{label}</span>
                <div className="badge-ai flex h-7 w-7 items-center justify-center rounded-md">
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-3xl font-bold">{value}</span>
              <Link
                href={href}
                className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
              >
                Ver todos →
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA principal */}
        <motion.div
          variants={blurFadeIn}
          className="glass-panel relative overflow-hidden rounded-xl p-8"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[#7c3aed] opacity-10 blur-[60px]" />
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
