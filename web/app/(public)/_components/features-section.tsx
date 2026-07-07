"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Layers,
  Globe,
  Star,
  BarChart2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  staggerContainer,
  staggerItem,
  bentoItem,
  blurFadeIn,
} from "@/lib/animations/fade";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

const nichoChips = ["esquetes", "receitas", "finanças", "pets"];

// Campos reais do guia gerado (mesmo conjunto usado na seção
// "Como funciona"), reforçando consistência entre as duas seções.
const guideFields = [
  { field: "gancho", from: { x: -36, y: -18 } },
  { field: "ritmo de fala", from: { x: 36, y: -20 } },
  { field: "arco emocional", from: { x: -30, y: 22 } },
  { field: "repetição", from: { x: 38, y: 16 } },
];

const secondaryFeatures = [
  {
    icon: Globe,
    iconColor: "text-[#c4b5fd]",
    title: "Público-alvo",
    description:
      "Linguagem, referências e horário de postagem se ajustam pro público que você definir.",
  },
  {
    icon: Star,
    iconColor: "text-[#facc15]",
    title: "Favoritos",
    description:
      "Marque as gerações que mais gostou e acesse rápido quando precisar de inspiração.",
  },
  {
    icon: BarChart2,
    iconColor: "text-[#4ade80]",
    title: "Histórico completo",
    description:
      "Toda geração fica salva. Consulte, compare e reutilize quando quiser.",
  },
  {
    icon: ShieldCheck,
    iconColor: "text-[#ff8a7a]",
    title: "Feedback por geração",
    description:
      "Avalie estrutura e roteiro separadamente. Seu feedback melhora as próximas gerações.",
  },
];

/**
 * Selo que substitui o número estático: badge com ícone que pulsa
 * suavemente em loop, sem depender de nenhum valor numérico.
 */
function LiveBadge({
  icon: Icon,
  label,
}: {
  icon: typeof Sparkles;
  label: string;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <motion.div
        animate={{
          boxShadow: [
            "0 0 0px rgba(139, 92, 246, 0)",
            "0 0 14px rgba(139, 92, 246, 0.35)",
            "0 0 0px rgba(139, 92, 246, 0)",
          ],
        }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8b5cf6]/40 bg-[#8b5cf6]/10"
      >
        <Icon className="h-3.5 w-3.5 text-[#c4b5fd]" />
      </motion.div>
      <span className="text-[10px] text-[#9995b0]">{label}</span>
    </div>
  );
}

/**
 * Card 1: os campos do guia se remontam em loop dentro do card,
 * mesmo padrão visual da seção "Como funciona", pra reforçar que
 * é o mesmo guia sendo referenciado nas duas seções.
 */
function GuideFieldsLoop() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCycle((c) => c + 1), 3400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-1 grid grid-cols-2 gap-1.5">
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
              delay: i * 0.08,
            }}
            style={{ fontFamily: "var(--font-mono)" }}
            className="rounded-md border border-[#8b5cf6]/20 bg-[#12121c] px-2.5 py-1.5 text-center text-[10.5px] text-[#c4b5fd]"
          >
            {item.field}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Card 2: chips de nicho alternando sozinhos, mesmo mecanismo da
 * seção "Como funciona", mostrando a troca entre nichos na prática.
 */
function NichoRotator() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a + 1) % nichoChips.length);
    }, 1500);
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

const primaryFeatures = [
  {
    icon: TrendingUp,
    badgeIcon: Sparkles,
    badgeLabel: "padrão extraído",
    title: "Baseado nos virais",
    description:
      "A IA analisa os vídeos que já viralizaram no seu nicho e extrai o padrão deles: como abrem, o ritmo da fala, a curva emocional. O guia vem desse padrão, não de achismo.",
    Loop: GuideFieldsLoop,
  },
  {
    icon: Layers,
    badgeIcon: Layers,
    badgeLabel: "por nicho",
    title: "Múltiplos nichos",
    description:
      "Gerencie mais de um nicho na mesma conta. Alterne entre eles na hora de gerar, cada guia sai calibrado pro nicho escolhido.",
    Loop: NichoRotator,
  },
];

export function FeaturesSection() {
  return (
    <section className="bg-grid-subtle relative overflow-hidden px-6 py-24">
      <div className="pointer-events-none absolute top-1/3 left-0 h-100 w-100 -translate-x-1/2 rounded-full bg-[#ff6b5e] opacity-[0.03] blur-[110px]" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-100 w-100 translate-x-1/3 rounded-full bg-[#8b5cf6] opacity-[0.04] blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          className="mb-16 flex flex-col items-center text-center"
        >
          <motion.span
            variants={blurFadeIn}
            className="mb-4 inline-flex rounded-full border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 px-4 py-1.5 text-xs font-medium text-[#c4b5fd]"
          >
            Funcionalidades
          </motion.span>
          <motion.h2
            variants={blurFadeIn}
            className="font-sans text-3xl font-bold tracking-tight text-[#f4f2fa] md:text-4xl"
          >
            Duas coisas fazem a diferença.{" "}
            <span className="text-[#8b5cf6]">O resto é conveniência.</span>
          </motion.h2>
          <motion.p
            variants={blurFadeIn}
            className="mt-3 max-w-md text-sm leading-relaxed text-[#9995b0]"
          >
            Do padrão extraído ao roteiro pronto, o Nicho centraliza tudo em um
            só lugar.
          </motion.p>
        </motion.div>

        {/* Bloco primário: 2 cards grandes lado a lado */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="mb-4 grid gap-4 md:grid-cols-2"
        >
          {primaryFeatures.map(
            ({
              icon: Icon,
              badgeIcon,
              badgeLabel,
              title,
              description,
              Loop,
            }) => (
              <motion.div
                key={title}
                variants={bentoItem}
                className="flex flex-col gap-4 rounded-2xl border border-[#8b5cf6]/20 bg-linear-to-br from-[#8b5cf6]/8 to-transparent p-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8b5cf6]">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <LiveBadge icon={badgeIcon} label={badgeLabel} />
                </div>
                <h3 className="font-sans text-lg font-semibold text-[#f4f2fa]">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-[#9995b0]">
                  {description}
                </p>
                <Loop />
              </motion.div>
            ),
          )}
        </motion.div>

        {/* Bloco secundário: 4 cards menores em grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {secondaryFeatures.map(
            ({ icon: Icon, iconColor, title, description }) => (
              <motion.div
                key={title}
                variants={staggerItem}
                className="glow-border flex flex-col gap-3 rounded-xl border border-[#22222f] bg-[#0f0f18] p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#22222f] bg-[#14141f]">
                  <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                </div>
                <h3 className="font-sans text-sm font-semibold text-[#f4f2fa]">
                  {title}
                </h3>
                <p className="text-xs leading-relaxed text-[#9995b0]">
                  {description}
                </p>
              </motion.div>
            ),
          )}
        </motion.div>
      </div>
    </section>
  );
}
