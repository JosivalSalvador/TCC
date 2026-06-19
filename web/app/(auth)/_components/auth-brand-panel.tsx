"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, FileVideo } from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const features = [
  {
    icon: TrendingUp,
    text: "Baseado nos vídeos mais virais do seu nicho",
  },
  {
    icon: FileVideo,
    text: "Estrutura completa + roteiro em uma única geração",
  },
  {
    icon: Sparkles,
    text: "Adapte o conteúdo para qualquer público-alvo",
  },
];

export function AuthBrandPanel() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#0a0a12] px-12 py-16">
      {/* Grid de fundo */}
      <div className="bg-grid-subtle pointer-events-none absolute inset-0 opacity-60" />

      {/* Glow violeta no canto inferior esquerdo */}
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[#7c3aed] opacity-10 blur-[96px]" />

      {/* Glow índigo no canto superior direito */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-[#6366f1] opacity-8 blur-[80px]" />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex h-full flex-col justify-between"
      >
        {/* Logo */}
        <motion.div variants={blurFadeIn} className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Sparkles className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-foreground text-lg font-semibold tracking-tight">
            Viralize
          </span>
        </motion.div>

        {/* Headline central */}
        <div className="flex flex-col gap-6">
          <motion.h1
            variants={blurFadeIn}
            className="text-4xl leading-tight font-bold tracking-tight xl:text-5xl"
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
            className="flex flex-col gap-3"
          >
            {features.map(({ icon: Icon, text }) => (
              <motion.li
                key={text}
                variants={staggerItem}
                className="flex items-center gap-3"
              >
                <div className="badge-ai flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-muted-foreground text-sm">{text}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Rodapé */}
        <motion.p
          variants={blurFadeIn}
          className="text-muted-foreground/50 text-xs"
        >
          © {new Date().getFullYear()} Viralize. Todos os direitos reservados.
        </motion.p>
      </motion.div>
    </div>
  );
}
