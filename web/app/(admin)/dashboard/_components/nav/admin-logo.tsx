// nav/admin-logo.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

const smoothEase: [number, number, number, number] = [0.25, 1, 0.35, 1];

interface AdminLogoProps {
  expanded: boolean;
  onNavigate?: () => void;
}

export function AdminLogo({ expanded, onNavigate }: AdminLogoProps) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex h-11 items-center gap-3 px-1"
    >
      {/* Ícone: respiração contínua no glow + reage ao hover do dock */}
      <motion.div
        animate={{
          scale: expanded ? 1.08 : 1,
          rotate: expanded ? -6 : 0,
          boxShadow: [
            "0 0 12px rgba(139,92,246,0.35)",
            "0 0 22px rgba(139,92,246,0.6)",
            "0 0 12px rgba(139,92,246,0.35)",
          ],
        }}
        transition={{
          scale: { duration: 0.3, ease: smoothEase },
          rotate: { duration: 0.3, ease: smoothEase },
          boxShadow: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#ff6b5e] to-[#8b5cf6]"
      >
        <Flame className="h-3.5 w-3.5 text-white" />
      </motion.div>

      <div className="flex min-w-0 flex-col overflow-hidden">
        {/* Wordmark: reveal com swoop (x+opacity+width) + shimmer no gradiente
            enquanto expandido — pausa parado em "0% 50%" quando colapsado */}
        <motion.span
          animate={{
            width: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
            x: expanded ? 0 : -6,
            backgroundPosition: expanded
              ? ["0% 50%", "100% 50%", "0% 50%"]
              : "0% 50%",
          }}
          transition={{
            width: { duration: 0.25, ease: smoothEase },
            opacity: { duration: 0.25, ease: smoothEase },
            x: { duration: 0.25, ease: smoothEase },
            backgroundPosition: expanded
              ? { duration: 3.5, repeat: Infinity, ease: "linear" }
              : { duration: 0 },
          }}
          className="overflow-hidden text-lg leading-tight font-bold whitespace-nowrap"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #a78bfa 0%, #7c3aed 50%, #6366f1 100%)",
            backgroundSize: "200% 100%",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Nicho
        </motion.span>

        <motion.span
          animate={{
            width: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{
            duration: 0.25,
            ease: smoothEase,
            delay: expanded ? 0.05 : 0,
          }}
          className="overflow-hidden text-xs font-medium whitespace-nowrap text-[#9995b0]"
        >
          Admin
        </motion.span>
      </div>
    </Link>
  );
}
