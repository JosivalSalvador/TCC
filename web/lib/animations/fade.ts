import { Variants, Transition } from "framer-motion";

// --- CURVA PREMIUM (O segredo da fluidez) ---
const premiumEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const baseTransition: Transition = {
  duration: 0.6,
  ease: premiumEase,
};

// ==========================================
// 1. ANIMAÇÕES GERAIS DA INTERFACE
// ==========================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: baseTransition },
};

// ==========================================
// 2. BLUR FADE (PADRÃO OURO DE REVELAÇÃO)
// ==========================================

export const blurFadeIn: Variants = {
  hidden: { opacity: 0, filter: "blur(10px)", y: 15 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration: 0.7, ease: premiumEase },
  },
};

// ==========================================
// 3. ORQUESTRADORES DE LISTA (Grids, Tabelas, Projetos)
// ==========================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, filter: "blur(6px)", y: 20 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: baseTransition,
  },
};

export const bentoItem: Variants = {
  hidden: { opacity: 0, filter: "blur(5px)", y: 15 },
  visible: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: baseTransition,
  },
};

// ==========================================
// 4. COMPONENTES DO ADMIN E MODAIS
// ==========================================

export const dialogEnter: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 10, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: premiumEase },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 10,
    filter: "blur(4px)",
    transition: { duration: 0.3, ease: premiumEase },
  },
};

// ==========================================
// 5. MICRO-INTERAÇÕES
// ==========================================

export const hoverScale = {
  scale: 1.01,
  transition: { duration: 0.3, ease: premiumEase },
};

export const tapScale = {
  scale: 0.98,
  transition: { duration: 0.1, ease: premiumEase },
};
