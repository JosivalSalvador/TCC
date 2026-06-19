import { ReactNode } from "react";
import { AdminSidebar } from "./dashboard/_components/admin-sidebar";
import { AdminHeader } from "./dashboard/_components/admin-header";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      {/* Sidebar fixa — escondida em mobile */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <AdminSidebar />
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <AdminHeader />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
