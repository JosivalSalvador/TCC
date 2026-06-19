"use client";

import { UserDropdown } from "./user-dropdown";
import { MobileMenu } from "./mobile-menu";

export function Header() {
  return (
    <header className="border-border/50 sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-[#0a0a12]/80 px-6 backdrop-blur-md">
      {/* Mobile — logo + menu */}
      <div className="flex items-center gap-3 lg:hidden">
        <MobileMenu />
      </div>

      {/* Espaço vazio no desktop (sidebar já tem o logo) */}
      <div className="hidden lg:block" />

      {/* Usuário */}
      <UserDropdown />
    </header>
  );
}
