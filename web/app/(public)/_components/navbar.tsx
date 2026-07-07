"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { fadeIn, hoverScale, tapScale } from "@/lib/animations/fade";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <motion.header
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="fixed inset-x-0 top-6 z-50 flex justify-center px-4"
    >
      <div className="relative w-full max-w-4xl">
        {/* Halo ambiente atrás da pill */}
        <div className="pointer-events-none absolute inset-x-8 -top-3 h-20 rounded-full bg-linear-to-r from-[#ff6b5e] to-[#8b5cf6] opacity-25 blur-[60px]" />

        {/* Borda em gradiente */}
        <div className="relative rounded-full bg-linear-to-r from-[#ff6b5e]/60 via-[#8b5cf6]/60 to-[#6366f1]/60 p-px shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <div
            className="flex h-18 items-center justify-between rounded-full px-4 pl-7 backdrop-blur-xl"
            style={{ backgroundColor: "rgba(13, 13, 20, 0.90)" }}
          >
            {/* Logo */}
            <motion.div whileHover={hoverScale} whileTap={tapScale}>
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-[#ff6b5e] to-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.5)]">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <span className="text-gradient font-sans text-xl font-bold tracking-tight">
                  nicho
                </span>
              </Link>
            </motion.div>

            {/* CTAs */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground rounded-full px-5 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
              >
                Entrar
              </Link>
              <motion.div whileHover={hoverScale} whileTap={tapScale}>
                <Button
                  asChild
                  className="rounded-full border-0 bg-linear-to-r from-[#ff6b5e] to-[#8b5cf6] px-6 text-white shadow-[0_0_0_rgba(255,107,94,0)] transition-shadow duration-300 hover:shadow-[0_0_25px_rgba(255,107,94,0.45)]"
                >
                  <Link href="/register">Começar grátis</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
