import { ReactNode } from "react";
import { AuthBrandPanel } from "./_components/auth-brand-panel";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Painel esquerdo — escondido em mobile */}
      <aside className="hidden lg:flex lg:w-1/2 xl:w-[55%]">
        <AuthBrandPanel />
      </aside>

      {/* Painel direito — formulário */}
      <main className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 xl:w-[45%]">
        {children}
      </main>
    </div>
  );
}
