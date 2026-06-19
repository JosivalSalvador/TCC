"use server";

import { nichesService } from "../services/niches.service";
import { revalidatePath } from "next/cache";
import { NicheInput, NicheResponse, HttpError } from "../types/index";

type ActionResponse<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

// ==========================================
// 🔍 ACTIONS DE BUSCA
// ==========================================

export async function getAllNichesAction() {
  try {
    return await nichesService.listAll();
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(httpError.message || "Falha ao buscar os nichos.");
  }
}

export async function getMyNichesAction() {
  try {
    return await nichesService.listMine();
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(httpError.message || "Falha ao buscar seus nichos.");
  }
}

// ==========================================
// 👤 ACTIONS DE MUTAÇÃO
// ==========================================

export async function addNicheAction(
  data: NicheInput,
): Promise<ActionResponse<{ niche: NicheResponse }>> {
  try {
    const response = await nichesService.addNiche(data);

    revalidatePath("/niches");

    return {
      success: true,
      data: { niche: response.niche },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao vincular nicho.",
    };
  }
}

export async function removeNicheAction(id: string): Promise<ActionResponse> {
  try {
    await nichesService.removeNiche(id);

    revalidatePath("/niches");

    return { success: true };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao remover nicho.",
    };
  }
}
