import Link from "next/link";
import { Terminal } from "lucide-react";
import { LoginForm } from "../_components/login-form";

export const metadata = {
  title: "Acesso ao Sistema | Auth",
};

export default function LoginPage() {
  return (
    <div className="glass-panel flex w-full flex-col rounded-2xl p-8 shadow-2xl sm:p-10">
      <div className="border-border/50 mb-8 flex flex-col items-start border-b pb-6">
        <div className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
          <Terminal className="h-3 w-3 text-emerald-500" />
          /sys/auth/login
        </div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Acesso Restrito
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Autentique-se para acessar a infraestrutura administrativa.
        </p>
      </div>

      <LoginForm />

      <div className="border-border/50 text-muted-foreground mt-8 border-t pt-6 text-center text-sm">
        Visitante sem credenciais?{" "}
        <Link
          href="/register"
          className="text-foreground font-medium transition-colors hover:text-emerald-500"
        >
          Solicitar Acesso
        </Link>
      </div>
    </div>
  );
}
