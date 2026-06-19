"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Globe,
  Star,
  BarChart2,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const features = [
  {
    icon: TrendingUp,
    title: "Baseado nos virais",
    description:
      "A IA analisa os padrões dos vídeos mais virais do seu nicho para gerar conteúdo com alto potencial de alcance.",
  },
  {
    icon: Globe,
    title: "Público-alvo por país",
    description:
      "Adapte o conteúdo para qualquer nacionalidade. A linguagem, referências e horário de postagem mudam automaticamente.",
  },
  {
    icon: Star,
    title: "Favoritos",
    description:
      "Marque as gerações que mais gostou e acesse rapidamente quando precisar de inspiração.",
  },
  {
    icon: BarChart2,
    title: "Histórico completo",
    description:
      "Todas as suas gerações ficam salvas. Consulte, compare e reutilize conteúdos anteriores a qualquer momento.",
  },
  {
    icon: RefreshCcw,
    title: "Múltiplos nichos",
    description:
      "Gerencie mais de um nicho na mesma conta. Alterne entre eles na hora de gerar sem precisar criar novas contas.",
  },
  {
    icon: ShieldCheck,
    title: "Feedback por geração",
    description:
      "Avalie a estrutura e o roteiro separadamente. Seu feedback ajuda a melhorar continuamente as gerações.",
  },
];

export function FeaturesSection() {
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
            Funcionalidades
          </motion.span>
          <motion.h2
            variants={blurFadeIn}
            className="text-3xl font-bold tracking-tight md:text-4xl"
          >
            Tudo que você precisa para{" "}
            <span className="text-gradient">criar mais</span>
          </motion.h2>
          <motion.p
            variants={blurFadeIn}
            className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed"
          >
            Do planejamento ao roteiro, o Nicho centraliza tudo em um só lugar.
          </motion.p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              variants={staggerItem}
              className="glass-panel glow-border flex flex-col gap-3 rounded-xl p-6"
            >
              <div className="badge-ai flex h-9 w-9 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-foreground font-semibold">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
