"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";
import { fadeIn } from "@/lib/animations/fade";

export function PublicFooter() {
  return (
    <motion.footer
      variants={fadeIn}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="border-border/50 border-t px-6 py-10"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
            <Layers className="text-primary-foreground h-3.5 w-3.5" />
          </div>
          <span className="text-foreground text-base font-semibold tracking-tight">
            Nicho
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Cadastrar
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-muted-foreground/50 text-xs">
          © {new Date().getFullYear()} Nicho. Todos os direitos reservados.
        </p>
      </div>
    </motion.footer>
  );
}
