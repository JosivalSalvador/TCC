"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Layers } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavItem } from "./nav-item";
import { Sparkles, ScrollText, Star, FolderOpen, Settings } from "lucide-react";

const navItems = [
  { href: "/generate", label: "Gerar conteúdo", icon: Sparkles },
  { href: "/history", label: "Histórico", icon: ScrollText },
  { href: "/favorites", label: "Favoritos", icon: Star },
  { href: "/niches", label: "Meus nichos", icon: FolderOpen },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="border-border/50 w-64 bg-[#0a0a12] p-0"
      >
        {/* Logo */}
        <div className="border-border/50 flex h-16 items-center border-b px-6">
          <Link
            href="/generate"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
              <Layers className="text-primary-foreground h-3.5 w-3.5" />
            </div>
            <span className="text-foreground text-base font-semibold tracking-tight">
              Nicho
            </span>
          </Link>
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setOpen(false)}>
              <NavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  pathname === item.href || pathname.startsWith(item.href + "/")
                }
              />
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
