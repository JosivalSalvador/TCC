"use client";

import Link from "next/link";
import { Flame, ArrowUpRight } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/6 px-6 pt-10 pb-8">
      {/* Halo ambiente, ecoando a navbar */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-linear-to-r from-[#ff6b5e] to-[#8b5cf6] opacity-[0.20] blur-[80px]" />

      <div className="relative flex w-full items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#ff6b5e] to-[#8b5cf6] shadow-[0_0_16px_rgba(139,92,246,0.4)]">
            <Flame className="h-4 w-4 text-white" />
          </div>
          <span className="text-gradient font-sans text-lg font-bold tracking-tight">
            nicho
          </span>
        </Link>

        <Link
          href="/register"
          className="text-muted-foreground hover:text-foreground group flex items-center gap-1 text-sm font-medium transition-colors"
        >
          Criar conta
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>

        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} nicho.app
        </p>
      </div>
    </footer>
  );
}
