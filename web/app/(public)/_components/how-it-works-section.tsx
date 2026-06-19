"use client";

import { motion } from "framer-motion";
import { Layers, Sparkles, ScrollText } from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const steps = [
  {
    step: "01",
    icon: Layers,
    title: "Escolha seu nicho",
    description:
      "Selecione um nicho já existente ou crie um novo. Você pode ter mais de um nicho vinculado à sua conta.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Defina seu público",
    description:
      "Informe opcionalmente a nacionalidade do seu público-alvo para um conteúdo ainda mais personalizado.",
  },
  {
    step: "03",
    icon: ScrollText,
    title: "Receba estrutura e roteiro",
    description:
      "Em segundos a IA retorna título, hashtags, descrição, horário de postagem e o roteiro completo do vídeo.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <motion.span
            variants={blurFadeIn}
            className="badge-ai mb-4 inline-flex rounded-full px-4 py-1.5 text-xs font-medium"
          >
            Como funciona
          </motion.span>
          <motion.h2
            variants={blurFadeIn}
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            Simples assim
          </motion.h2>
          <motion.p
            variants={blurFadeIn}
            className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed"
          >
            Três passos para sair do zero e chegar a um conteúdo pronto para
            gravar.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 md:grid-cols-3"
        >
          {steps.map(({ step, icon: Icon, title, description }) => (
            <motion.div
              key={step}
              variants={staggerItem}
              className="glass-panel glow-border relative flex flex-col gap-4 rounded-xl p-6"
            >
              {/* Step number */}
              <span className="text-primary/30 font-mono text-4xl leading-none font-bold">
                {step}
              </span>

              {/* Icon */}
              <div className="badge-ai flex h-10 w-10 items-center justify-center rounded-lg">
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1.5">
                <h3 className="text-foreground font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
