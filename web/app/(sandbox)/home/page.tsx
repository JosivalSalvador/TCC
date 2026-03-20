import { cookies } from "next/headers";
import { SandboxClient } from "../_components/sandbox-client";

export const metadata = {
  title: "Sandbox | Usuário Autenticado",
};

export default async function SandboxPage() {
  // Lemos o cookie diretamente no servidor
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("auth_session")?.value;

  let user = null;

  if (sessionCookie) {
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const session = JSON.parse(decoded);
      user = session.user;
    } catch (error) {
      console.error("[Sandbox] Falha ao decodificar sessão:", error);
    }
  }

  // Passamos os dados reais do usuário para o Client Component
  return <SandboxClient user={user} />;
}
