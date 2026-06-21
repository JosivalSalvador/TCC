"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Layers,
  LayoutDashboard,
  Users,
  FolderOpen,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminNavItem } from "./admin-nav-item";

const navItems = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/dashboard/users", label: "Usuários", icon: Users },
  { href: "/dashboard/niches", label: "Nichos", icon: FolderOpen },
  { href: "/dashboard/generations", label: "Gerações", icon: Sparkles },
  { href: "/dashboard/feedbacks", label: "Feedbacks", icon: MessageSquare },
];

export function AdminMobileMenu() {
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
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
              <Layers className="text-primary-foreground h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-semibold tracking-tight">
                Nicho
              </span>
              <span className="text-muted-foreground text-xs">Admin</span>
            </div>
          </Link>
        </div>

        {/* Navegação */}
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <div key={item.href} onClick={() => setOpen(false)}>
              <AdminNavItem
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href)
                }
              />
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
