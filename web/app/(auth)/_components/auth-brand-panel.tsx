"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, FileVideo, Zap } from "lucide-react";
import Link from "next/link";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const features = [
  {
    icon: TrendingUp,
    label: "Tendências reais",
    text: "Baseado nos vídeos mais virais do seu nicho",
  },
  {
    icon: FileVideo,
    label: "Tudo em uma geração",
    text: "Estrutura completa + roteiro prontos para usar",
  },
  {
    icon: Zap,
    label: "Público-alvo preciso",
    text: "Adapte o conteúdo para qualquer nacionalidade",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#0a0a12] px-12 py-16">
      {/* Grid de fundo */}
      <div className="bg-grid-subtle pointer-events-none absolute inset-0 opacity-100" />

      {/* Glow violeta inferior esquerdo */}
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-120 w-120 rounded-full bg-[#7c3aed] opacity-[0.18] blur-[120px]" />

      {/* Glow índigo superior direito */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-80 w-80 rounded-full bg-[#6366f1] opacity-[0.12] blur-[90px]" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex h-full flex-col justify-between"
      >
        {/* Logo — clicável, volta pra home */}
        <motion.div variants={blurFadeIn}>
          <Link
            href="/"
            className="group flex w-fit items-center gap-2.5 transition-opacity hover:opacity-80"
          >
            <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg shadow-lg shadow-[#7c3aed]/30 transition-shadow group-hover:shadow-[#7c3aed]/50">
              <Sparkles className="text-primary-foreground h-4 w-4" />
            </div>
            <span className="text-foreground text-lg font-semibold tracking-tight">
              Viralize
            </span>
          </Link>
        </motion.div>

        {/* Headline central */}
        <div className="flex flex-col gap-7">
          <motion.h1
            variants={blurFadeIn}
            className="text-4xl leading-[1.15] font-bold tracking-tight xl:text-5xl"
          >
            Crie conteúdo <span className="text-gradient">viral</span> com
            inteligência artificial
          </motion.h1>

          <motion.p
            variants={blurFadeIn}
            className="text-muted-foreground max-w-sm text-base leading-relaxed"
          >
            Escolha seu nicho, defina seu público e receba em segundos a
            estrutura e o roteiro perfeitos para o seu próximo vídeo.
          </motion.p>

          {/* Features */}
          <motion.ul
            variants={staggerContainer}
            className="flex flex-col gap-4"
          >
            {features.map(({ icon: Icon, label, text }) => (
              <motion.li
                key={label}
                variants={staggerItem}
                className="flex items-start gap-3.5"
              >
                <div className="badge-ai mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-foreground text-sm font-medium">
                    {label}
                  </span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {text}
                  </span>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Rodapé */}
        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground/40 text-xs"
        >
          © {new Date().getFullYear()} Viralize. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}
