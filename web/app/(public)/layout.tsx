import { ReactNode } from "react";
import { PublicNavbar } from "./_components/navbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a10]">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
