"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { useGeneration } from "@/hooks/use-generations";
import { HistoryDetail } from "../../_components/history/history-detail";
import { HistoryDetailSkeleton } from "../../_components/history/history-detail-skeleton";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default function HistoryDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data, isLoading } = useGeneration(id);

  const generation = data?.generation;

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-3">
          <Link
            href="/history"
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao histórico
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            Detalhes da geração
          </h1>
        </motion.div>

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
