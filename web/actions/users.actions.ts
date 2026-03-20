// web/actions/users.actions.ts
"use server";

import { usersService } from "../services/users.service";
import { destroySession } from "../lib/auth/session";
import { revalidatePath } from "next/cache";
import {
  UpdateUserInput,
  UpdatePasswordInput,
  UpdateRoleInput,
  UserResponse,
  HttpError,
} from "../types/index";

// Mantendo o mesmo padrão de contrato estrito para os Hooks de UI (Mutações)
type ActionResponse<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

// ==========================================
// 🔍 ACTIONS DE BUSCA (GET - Para os Hooks / React Query)
// ==========================================

export async function getProfileAction() {
  try {
    return await usersService.getProfile();
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(
      httpError.message || "Falha ao buscar o perfil do usuário.",
    );
  }
}

export async function getUsersListAction() {
  try {
    return await usersService.listAll();
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(httpError.message || "Falha ao listar os usuários.");
  }
}

// ==========================================
// 👤 ACTIONS DO CLIENTE (Mutações / Minha Conta)
// ==========================================

export async function updateProfileAction(
  data: UpdateUserInput,
): Promise<ActionResponse<{ user: UserResponse }>> {
  try {
    const response = await usersService.updateProfile(data);

    // Invalida o cache da página do cliente para refletir o novo nome/email na hora
    revalidatePath("/home");

    return {
      success: true,
      data: { user: response.user },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao atualizar perfil.",
    };
  }
}

export async function changePasswordAction(
  data: UpdatePasswordInput,
): Promise<ActionResponse> {
  try {
    const response = await usersService.changePassword(data);
    return { success: true, message: response.message };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao alterar a senha.",
    };
  }
}

export async function deleteAccountAction(): Promise<ActionResponse> {
  try {
    // 1. Apaga os dados no banco de dados do Fastify
    await usersService.deleteAccount();
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao deletar conta.",
    };
  }

  // 2. O Next.js exige que o redirect() aconteça FORA do bloco try/catch
  // (porque por baixo dos panos o redirect joga um erro especial de navegação)
  await destroySession();
  return { success: true, message: "Conta excluída com sucesso." };
}

// ==========================================
// 👑 ACTIONS DE ADMINISTRAÇÃO (Mutações / Staff Only)
// ==========================================

export async function updateRoleAction(
  id: string,
  data: UpdateRoleInput,
): Promise<ActionResponse<{ user: UserResponse }>> {
  try {
    const response = await usersService.updateRole(id, data);

    // Invalida a tabela de usuários do Admin
    revalidatePath("/dashboard/users");

    return {
      success: true,
      data: { user: response.user },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao atualizar cargo.",
    };
  }
}

export async function adminDeleteUserAction(
  id: string,
): Promise<ActionResponse> {
  try {
    await usersService.adminDelete(id);

    // Atualiza a tabela do Admin removendo a linha do usuário instantaneamente
    revalidatePath("/dashboard/users");

    return { success: true };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao excluir usuário.",
    };
  }
}
