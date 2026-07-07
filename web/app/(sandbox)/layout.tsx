// layout.tsx
import { ReactNode } from "react";
import { Dock } from "./_components/dock";

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <Dock />

      {/* Padding fixo pro estado compacto do dock (76px + respiro de 24px) */}
      <main className="min-h-screen px-6 py-8 pb-28 lg:pb-8 lg:pl-32">
        {children}
      </main>
    </div>
  );
}
