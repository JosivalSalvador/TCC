import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GridBackground } from "@/components/ui/grid-background";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-foreground relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <GridBackground />

      {/* Botão de voltar estilo terminal premium */}
      <div className="absolute top-6 left-6 z-50 sm:top-10 sm:left-10">
        <Link
          href="/"
          className="group text-muted-foreground hover:text-foreground flex items-center gap-2 font-mono text-xs transition-colors"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          ~/sys/home
        </Link>
      </div>

      {/* Container que vai segurar os painéis de vidro */}
      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}
