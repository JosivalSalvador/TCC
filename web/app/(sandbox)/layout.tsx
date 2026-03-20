import { ReactNode } from "react";
import { GridBackground } from "@/components/ui/grid-background";

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-dvh max-w-[100vw] flex-col overflow-x-hidden">
      {/* O Motor Visual do Fundo (Grid OLED) mantido para consistência */}
      <GridBackground />

      {/* Sem Header ou Footer público. Imersão total no sistema. */}
      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-6">
        {children}
      </main>
    </div>
  );
}
