import Link from "next/link";
import { Terminal } from "lucide-react";
import { RegisterForm } from "../_components/register-form";

export const metadata = {
  title: "Criar Instância | Auth",
};

export default function RegisterPage() {
  return (
    <div className="glass-panel flex w-full flex-col rounded-2xl p-8 shadow-2xl sm:p-10">
      <div className="border-border/50 mb-8 flex flex-col items-start border-b pb-6">
        <div className="text-muted-foreground mb-4 flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
          <Terminal className="h-3 w-3 text-emerald-500" />
          /sys/auth/register
        </div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
          Nova Instância
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Alocando novo usuário na infraestrutura.
        </p>
      </div>

      <RegisterForm />

      <div className="border-border/50 text-muted-foreground mt-8 border-t pt-6 text-center text-sm">
        Já possui credenciais?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium transition-colors hover:text-emerald-500"
        >
          Iniciar Sessão
        </Link>
      </div>
    </div>
  );
}
