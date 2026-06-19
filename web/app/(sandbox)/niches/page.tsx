"use client";

import { motion } from "framer-motion";
import { useMyNiches } from "@/hooks/use-niches";
import { NichesList } from "../_components/niches/niches-list";
import { AddNicheForm } from "../_components/niches/add-niche-form";
import { blurFadeIn, staggerContainer } from "@/lib/animations/fade";

export default function NichesPage() {
  const { data, isLoading } = useMyNiches();

  const niches = data?.niches ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Meus nichos</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os nichos vinculados à sua conta.
          </p>
        </motion.div>

        {/* Formulário de adição */}
        <motion.div variants={blurFadeIn}>
          <AddNicheForm />
        </motion.div>

        {/* Lista */}
        <motion.div variants={blurFadeIn}>
          {isLoading ? null : <NichesList niches={niches} />}
        </motion.div>
      </motion.div>
    </div>
  );
}
