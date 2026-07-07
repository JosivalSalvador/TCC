"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { useGeneration } from "@/hooks/use-generations";
import { HistoryDetail } from "../../_components/history/history-detail";
import { HistoryDetailSkeleton } from "../../_components/history/history-detail-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function HistoryDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data, isLoading } = useGeneration(id);

  const generation = data?.generation;

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <div className="flex flex-col gap-4">
          <motion.div variants={blurFadeIn}>
            <Link
              href="/history"
              className="group border-border/50 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
              Voltar ao histórico
            </Link>
          </motion.div>

          <motion.div variants={blurFadeIn} className="flex flex-col gap-2">
            <span className="text-primary flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Guia arquivado
            </span>
            <h1 className="text-3xl font-bold tracking-tight">
              {generation ? (
                <>
                  O padrão por trás de{" "}
                  <span className="text-gradient">
                    {generation.nicheRequested}
                  </span>
                </>
              ) : (
                "Revisitando o guia"
              )}
            </h1>
          </motion.div>
        </div>

        {/* Conteúdo */}
        <motion.div variants={blurFadeIn}>
          {isLoading || !generation ? (
            <HistoryDetailSkeleton />
          ) : (
            <HistoryDetail generation={generation} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
