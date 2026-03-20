// web/actions/auth.actions.ts

"use server";

import { authService } from "../services/auth.service";
import { setSession, destroySession } from "../lib/auth/session";
// Importamos o HttpError que criamos lá no types/index.ts!
import { LoginInput, RegisterUserInput, HttpError } from "../types/index";
import { redirect } from "next/navigation";

type ActionResponse<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * ACTION: Realiza o login e cria a sessão do Next.js
 */
export async function loginAction(data: LoginInput): Promise<ActionResponse> {
  try {
    const { token, refreshToken, user } = await authService.login(data);
    await setSession(token, refreshToken, user);

    return { success: true };
  } catch (error: unknown) {
    // <-- Padrão estrito do TypeScript
    // Informamos ao TypeScript que o erro veio do nosso httpClient
    const httpError = error as HttpError;

    return {
      success: false,
      error: httpError.message || "Credenciais inválidas ou erro no servidor.",
    };
  }
}

/**
 * ACTION: Registra um novo usuário
 */
export async function registerAction(
  data: RegisterUserInput,
): Promise<ActionResponse<{ userId: string }>> {
  try {
    const response = await authService.register(data);

    return { success: true, data: { userId: response.userId } };
  } catch (error: unknown) {
    const httpError = error as HttpError;

    return {
      success: false,
      error:
        httpError.message ||
        "Não foi possível criar a conta. Verifique os dados.",
    };
  }
}

/**
 * ACTION: Encerra a sessão e desloga o usuário
 */
export async function logoutAction() {
  try {
    await authService.logout();
  } catch (error: unknown) {
    // Se der erro no Fastify, registramos no log interno do servidor, mas seguimos a vida
    console.error("Erro ao invalidar token no backend:", error);
  } finally {
    await destroySession();
  }

  redirect("/login");
}
