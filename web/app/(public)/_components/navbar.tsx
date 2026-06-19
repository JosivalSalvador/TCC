"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { fadeIn } from "@/lib/animations/fade";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  return (
    <motion.header
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="border-border/50 sticky top-0 z-50 w-full border-b backdrop-blur-md"
      style={{ backgroundColor: "rgba(13, 13, 20, 0.85)" }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
            <Layers className="text-primary-foreground h-3.5 w-3.5" />
          </div>
          <span className="text-foreground text-base font-semibold tracking-tight">
            Nicho
          </span>
        </Link>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Entrar
          </Link>
          <Button asChild size="sm" className="glow-primary">
            <Link href="/register">Começar grátis</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
