import { ReactNode } from "react";
import { PublicNavbar } from "./_components/navbar";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
