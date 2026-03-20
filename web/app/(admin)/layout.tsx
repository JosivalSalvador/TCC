import { ReactNode } from "react";
import { Sidebar } from "./dashboard/_components/geral/sidebar";
import { TopNav } from "./dashboard/_components/geral/top-nav";
import { GridBackground } from "@/components/ui/grid-background";

export const metadata = {
  title: "Admin Control Panel",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-dvh max-w-[100vw] overflow-hidden">
      {/* O Motor Visual do Fundo (Grid OLED) */}
      <GridBackground />

      {/* Menu Lateral Fixo */}
      <Sidebar />

      {/* Área Principal (Empurrada 64px = 16rem pra direita no Desktop para dar espaço à Sidebar) */}
      <div className="relative z-10 flex h-dvh flex-1 flex-col overflow-hidden md:pl-64">
        {/* Barra Superior */}
        <TopNav />

        {/* Onde as páginas vão renderizar. O overflow-y-auto faz SÓ o meio da tela rolar. */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
