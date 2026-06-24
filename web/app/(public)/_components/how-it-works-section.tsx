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
    title: "Escolha o nicho",
    description:
      "Selecione um nicho já existente ou cria um novo. Pode ter mais de um na conta — alterna na hora de gerar, sem burocracia.",
  },
  {
    step: "02",
    icon: Sparkles,
    title: "Informe o público (opcional)",
    description:
      "Se quiser, diz a nacionalidade do seu público. O título, o horário de postagem e as referências do roteiro mudam pra esse contexto.",
  },
  {
    step: "03",
    icon: ScrollText,
    title: "Receba título, hashtags e roteiro",
    description:
      "Em segundos: título com alto potencial de clique, hashtags do nicho, horário ideal de postagem, duração recomendada e o hook do roteiro. Tudo baseado nos vídeos que já viralizaram.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <motion.span
            variants={blurFadeIn}
            className="badge-ai mb-3 inline-flex rounded-full px-3.5 py-1 text-xs font-medium"
          >
            Como funciona
          </motion.span>
          <motion.h2
            variants={blurFadeIn}
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            Do nicho ao conteúdo pronto em{" "}
            <span className="text-gradient">menos de 30 segundos</span>
          </motion.h2>
          <motion.p
            variants={blurFadeIn}
            className="text-muted-foreground mt-3 max-w-sm text-sm leading-relaxed"
          >
            Sem templates genéricos. A geração é baseada nos padrões reais dos
            vídeos mais virais do seu nicho.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4 md:grid-cols-3"
        >
          {steps.map(({ step, icon: Icon, title, description }, index) => (
            <motion.div
              key={step}
              variants={staggerItem}
              className="glass-panel glow-border relative flex flex-col gap-4 rounded-xl p-6"
            >
              {/* Número e ícone lado a lado */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-4xl leading-none font-bold text-[#7c3aed]/20">
                  {step}
                </span>
                <div className="badge-ai flex h-9 w-9 items-center justify-center rounded-lg">
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex flex-col gap-1.5">
                <h3 className="text-foreground font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Conector entre cards (apenas desktop, não no último) */}
              {index < steps.length - 1 && (
                <div className="absolute top-1/2 -right-2.5 hidden h-px w-5 -translate-y-1/2 bg-[#2a2a3d] md:block" />
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
