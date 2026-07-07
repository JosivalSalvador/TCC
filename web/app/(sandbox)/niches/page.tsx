"use client";

import { motion } from "framer-motion";
import { useMyNiches } from "@/hooks/use-niches";
import { NichesList } from "../_components/niches/niches-list";
import { AddNicheForm } from "../_components/niches/add-niche-form";
import {
  blurFadeIn,
  staggerContainer,
  staggerItem,
} from "@/lib/animations/fade";
import { Skeleton } from "@/components/ui/skeleton";

export default function NichesPage() {
  const { data, isLoading } = useMyNiches();

  const niches = data?.niches ?? [];

  return (
    <div className="mx-auto w-[90%] max-w-3xl">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-8 py-10"
      >
        {/* Header */}
        <motion.div variants={blurFadeIn} className="flex flex-col gap-2">
          <h1 className="text-gradient text-3xl font-bold tracking-tight">
            Meus nichos
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Gerencie os nichos vinculados à sua conta.
          </p>
        </motion.div>

        {/* Formulário de adição */}
        <motion.div variants={staggerItem}>
          <AddNicheForm />
        </motion.div>

        {/* Lista */}
        <motion.div variants={staggerItem}>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <NichesList niches={niches} />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
