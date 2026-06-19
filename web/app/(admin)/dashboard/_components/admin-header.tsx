"use client";

import { UserDropdown } from "@/app/(sandbox)/_components/user-dropdown";
import { AdminMobileMenu } from "./admin-mobile-menu";

export function AdminHeader() {
  return (
    <header className="border-border/50 sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-[#0a0a12]/80 px-6 backdrop-blur-md">
      {/* Mobile — menu */}
      <div className="flex items-center gap-3 lg:hidden">
        <AdminMobileMenu />
      </div>

      {/* Espaço vazio no desktop */}
      <div className="hidden lg:block" />

      {/* Usuário */}
      <UserDropdown />
    </header>
  );
}
