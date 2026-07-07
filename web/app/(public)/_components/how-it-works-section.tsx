"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListFilter, Users, FileStack } from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

const nichoChips = ["esquetes", "receitas", "finanças", "pets"];

const guideFields = [
  { field: "gancho", from: { x: -40, y: -20 } },
  { field: "ritmo de fala", from: { x: 40, y: -24 } },
  { field: "arco emocional", from: { x: -36, y: 26 } },
  { field: "repetição", from: { x: 44, y: 18 } },
  { field: "trilha e efeitos", from: { x: -50, y: 4 } },
  { field: "call to action", from: { x: 50, y: -6 } },
];

function NichoSwitcher() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a + 1) % nichoChips.length);
    }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {nichoChips.map((nicho, i) => (
        <motion.span
          key={nicho}
          animate={{
            backgroundColor:
              i === active ? "rgba(139, 92, 246, 0.18)" : "rgba(18, 18, 28, 1)",
            borderColor:
              i === active
                ? "rgba(139, 92, 246, 0.5)"
                : "rgba(42, 42, 61, 0.8)",
            color: i === active ? "#c4b5fd" : "#5f5b78",
            scale: i === active ? 1.05 : 1,
          }}
          transition={{ duration: 0.4, ease: smoothEase }}
          style={{ fontFamily: "var(--font-mono)" }}
          className="rounded-full border px-3 py-1 text-[11px]"
        >
          {nicho}
        </motion.span>
      ))}
    </div>
  );
}

function PublicoToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-1 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <motion.div
          animate={{
            backgroundColor: on ? "rgba(139, 92, 246, 0.9)" : "#2a2a3d",
          }}
          transition={{ duration: 0.3 }}
          className="relative h-5 w-9 rounded-full"
        >
          <motion.div
            animate={{ x: on ? 16 : 2 }}
            transition={{ duration: 0.3, ease: smoothEase }}
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white"
          />
        </motion.div>
        <span
          style={{ fontFamily: "var(--font-mono)" }}
          className="text-[11px] text-[#9995b0]"
        >
          público-alvo
        </span>
      </div>

      <motion.p className="text-[11px] leading-relaxed text-[#5f5b78] italic">
        {on
          ? '"tom ajustado, referências mais próximas do seu público"'
          : '"tom padrão do nicho, sem ajuste de público"'}
      </motion.p>
    </div>
  );
}

/**
 * Card 3: os campos do guia se desmontam e remontam em loop,
 * cada ciclo os traz de volta de direções diferentes com spring,
 * igual em frequência de movimento aos cards 1 e 2.
 */
function GuidePanel() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCycle((c) => c + 1), 3600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative mt-2 grid grid-cols-2 gap-1.5">
      <AnimatePresence mode="popLayout">
        {guideFields.map((item, i) => (
          <motion.div
            key={`${item.field}-${cycle}`}
            initial={{
              opacity: 0,
              x: item.from.x,
              y: item.from.y,
              scale: 0.85,
            }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 15,
              delay: i * 0.09,
            }}
            style={{ fontFamily: "var(--font-mono)" }}
            className="rounded-md border border-[#8b5cf6]/20 bg-[#12121c] px-2.5 py-2 text-center text-[10.5px] text-[#c4b5fd]"
          >
            {item.field}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConnectorPath() {
  return (
    <div className="pointer-events-none absolute top-1/2 -right-4 z-10 hidden h-8 w-8 -translate-y-1/2 md:block">
      <svg viewBox="0 0 32 32" className="h-full w-full overflow-visible">
        <motion.path
          d="M2 16 H26 M18 8 L26 16 L18 24"
          fill="none"
          stroke="#5a5a72"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{
            hidden: { pathLength: 0, opacity: 0 },
            visible: {
              pathLength: 1,
              opacity: 1,
              transition: { duration: 0.7, ease: smoothEase, delay: 0.3 },
            },
          }}
        />
      </svg>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="bg-grid-subtle relative overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute top-1/2 left-0 h-100 w-100 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8b5cf6] opacity-[0.04] blur-[110px]" />
      <div className="pointer-events-none absolute top-1/2 right-0 h-100 w-100 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6b5e] opacity-[0.03] blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="mb-12 flex flex-col items-center text-center"
        >
          <motion.span
            variants={blurFadeIn}
            className="mb-3 inline-flex rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 px-3.5 py-1 text-xs font-medium text-[#c4b5fd]"
          >
            Como funciona
          </motion.span>
          <motion.h2
            variants={blurFadeIn}
            className="font-sans text-3xl font-bold tracking-tight text-[#f4f2fa] md:text-4xl"
          >
            Comece agora e veja seu{" "}
            <span className="text-[#8b5cf6]">guia de conteúdo</span> tomar forma
          </motion.h2>
          <motion.p
            variants={blurFadeIn}
            className="mt-3 max-w-sm text-sm leading-relaxed text-[#9995b0]"
          >
            Três passos entre você e um guia baseado nos vídeos que já
            viralizaram no seu nicho.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {/* Card 1 */}
          <motion.div
            variants={staggerItem}
            whileHover={{
              y: -4,
              transition: { duration: 0.3, ease: smoothEase },
            }}
            className="relative flex flex-col gap-4 rounded-xl border border-[#22222f] bg-[#0f0f18] p-6"
          >
            <div className="flex items-center justify-between">
              <span
                style={{ fontFamily: "var(--font-mono)" }}
                className="text-4xl leading-none font-bold text-[#8b5cf6]/30"
              >
                01
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8b5cf6]/20 bg-[#8b5cf6]/10">
                <ListFilter className="h-4 w-4 text-[#c4b5fd]" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-sans font-semibold text-[#f4f2fa]">
                Escolha o nicho
              </h3>
              <p className="text-sm leading-relaxed text-[#9995b0]">
                Selecione um nicho já existente ou crie um novo. Pode ter mais
                de um na conta, alterna na hora de gerar.
              </p>
            </div>
            <NichoSwitcher />
            <ConnectorPath />
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={staggerItem}
            whileHover={{
              y: -4,
              transition: { duration: 0.3, ease: smoothEase },
            }}
            className="relative flex flex-col gap-4 rounded-xl border border-[#22222f] bg-[#0f0f18] p-6"
          >
            <div className="flex items-center justify-between">
              <span
                style={{ fontFamily: "var(--font-mono)" }}
                className="text-4xl leading-none font-bold text-[#8b5cf6]/30"
              >
                02
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8b5cf6]/20 bg-[#8b5cf6]/10">
                <Users className="h-4 w-4 text-[#c4b5fd]" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-sans font-semibold text-[#f4f2fa]">
                Informe o público-alvo (opcional)
              </h3>
              <p className="text-sm leading-relaxed text-[#9995b0]">
                Se quiser, diz quem é o seu público. O roteiro se ajusta pra
                esse contexto.
              </p>
            </div>
            <PublicoToggle />
            <ConnectorPath />
          </motion.div>

          {/* Card 3 */}
          <motion.div
            variants={staggerItem}
            className="relative flex flex-col gap-4 rounded-xl border border-[#8b5cf6]/30 bg-linear-to-br from-[#8b5cf6]/8 to-transparent p-6"
          >
            <div className="flex items-center justify-between">
              <span
                style={{ fontFamily: "var(--font-mono)" }}
                className="text-4xl leading-none font-bold text-[#8b5cf6]/40"
              >
                03
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8b5cf6]/30 bg-[#8b5cf6]/15">
                <FileStack className="h-4 w-4 text-[#c4b5fd]" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-sans font-semibold text-[#f4f2fa]">
                Receba um guia por camadas
              </h3>
              <p className="text-sm leading-relaxed text-[#9995b0]">
                Título, hashtags, horário de postagem e um roteiro detalhado,
                cada instrução baseada no que já viralizou no seu nicho.
              </p>
            </div>
            <GuidePanel />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
