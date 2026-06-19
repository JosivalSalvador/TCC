"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Layers,
  Sparkles,
  ScrollText,
  Star,
  FolderOpen,
  Settings,
} from "lucide-react";
import { NavItem } from "./nav-item";

const navItems = [
  {
    href: "/generate",
    label: "Gerar conteúdo",
    icon: Sparkles,
  },
  {
    href: "/history",
    label: "Histórico",
    icon: ScrollText,
  },
  {
    href: "/favorites",
    label: "Favoritos",
    icon: Star,
  },
  {
    href: "/niches",
    label: "Meus nichos",
    icon: FolderOpen,
  },
  {
    href: "/settings",
    label: "Configurações",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="border-border/50 flex h-full flex-col border-r bg-[#0a0a12]">
      {/* Logo */}
      <div className="border-border/50 flex h-16 items-center border-b px-6">
        <Link href="/home" className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
            <Layers className="text-primary-foreground h-3.5 w-3.5" />
          </div>
          <span className="text-foreground text-base font-semibold tracking-tight">
            Nicho
          </span>
        </Link>
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={
              pathname === item.href || pathname.startsWith(item.href + "/")
            }
          />
        ))}
      </nav>
    </div>
  );
}
