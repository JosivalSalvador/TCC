// (admin)/layout.tsx
import { ReactNode } from "react";
import { AdminDock } from "./dashboard/_components/nav/admin-dock";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background min-h-screen">
      <AdminDock />

      {/* Padding fixo pro estado compacto do dock (76px + respiro de 24px) */}
      <main className="min-h-screen px-6 py-8 pb-28 lg:pb-8 lg:pl-32">
        {children}
      </main>
    </div>
  );
}
