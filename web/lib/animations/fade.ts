import { Variants, Transition } from "framer-motion";

// Curva suave — transmite fluidez e modernidade
const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

const baseTransition: Transition = {
  duration: 0.5,
  ease: smoothEase,
};

// ==========================================
// 1. ANIMAÇÕES GERAIS DA INTERFACE
// ==========================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: baseTransition },
};

// ==========================================
// 2. BLUR FADE (ENTRADA PRINCIPAL DE PÁGINAS)
// ==========================================

export const blurFadeIn: Variants = {
  hidden: { opacity: 0, filter: "blur(8px)", y: 12 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.6, ease: smoothEase },
  },
};

// ==========================================
// 3. ORQUESTRADORES DE LISTA (Cards, Tabelas, Grids)
// ==========================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)", y: 16 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: baseTransition,
  },
};

export const bentoItem: Variants = {
  hidden: { opacity: 0, filter: "blur(4px)", y: 12 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: baseTransition,
  },
};

// ==========================================
// 4. MODAIS E DIALOGS
// ==========================================

export const dialogEnter: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 8, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    filter: "blur(4px)",
    transition: { duration: 0.25, ease: smoothEase },
  },
};

// ==========================================
// 5. MICRO-INTERAÇÕES
// ==========================================

export const hoverScale = {
  scale: 1.015,
  transition: { duration: 0.25, ease: smoothEase },
};

export const tapScale = {
  scale: 0.97,
  transition: { duration: 0.1, ease: smoothEase },
};
