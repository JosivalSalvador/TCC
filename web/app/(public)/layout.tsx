import { ReactNode } from "react";
import { Header } from "./_components/geral/header";
import { Footer } from "./_components/geral/footer";
import { GridBackground } from "@/components/ui/grid-background";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-dvh max-w-[100vw] flex-col overflow-x-hidden">
      {/* O Motor Visual do Fundo (Grid OLED) */}
      <GridBackground />

      <Header />

      {/* pt-20 para dar respiro do Header fixo */}
      <main className="relative z-10 flex w-full flex-1 flex-col pt-2">
        {children}
      </main>

      <Footer />
    </div>
  );
}
