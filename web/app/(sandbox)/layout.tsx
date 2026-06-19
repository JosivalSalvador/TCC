import { ReactNode } from "react";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Sidebar fixa — escondida em mobile */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Sidebar />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <Header />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
