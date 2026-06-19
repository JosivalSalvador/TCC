"use server";

import { generationsService } from "../services/generations.service";
import { revalidatePath } from "next/cache";
import {
  CreateGenerationInput,
  FavoriteUpdateInput,
  GenerationResponse,
  ListGenerationsQuery,
  HttpError,
} from "../types/index";

type ActionResponse<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

// ==========================================
// 🔍 ACTIONS DE BUSCA
// ==========================================

export async function getGenerationsAction(query?: ListGenerationsQuery) {
  try {
    return await generationsService.listAll(query);
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(httpError.message || "Falha ao buscar as gerações.");
  }
}

export async function getGenerationByIdAction(id: string) {
  try {
    return await generationsService.getById(id);
  } catch (error: unknown) {
    const httpError = error as HttpError;
    throw new Error(httpError.message || "Falha ao buscar a geração.");
  }
}

// ==========================================
// 👤 ACTIONS DE MUTAÇÃO
// ==========================================

export async function createGenerationAction(
  data: CreateGenerationInput,
): Promise<ActionResponse<{ generation: GenerationResponse }>> {
  try {
    const response = await generationsService.create(data);

    revalidatePath("/history");

    return {
      success: true,
      data: { generation: response.generation },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao criar geração.",
    };
  }
}

export async function updateFavoriteAction(
  id: string,
  data: FavoriteUpdateInput,
): Promise<ActionResponse<{ generation: GenerationResponse }>> {
  try {
    const response = await generationsService.updateFavorite(id, data);

    revalidatePath("/history");
    revalidatePath("/favorites");

    return {
      success: true,
      data: { generation: response.generation },
      message: response.message,
    };
  } catch (error: unknown) {
    const httpError = error as HttpError;
    return {
      success: false,
      error: httpError.message || "Erro ao atualizar favorito.",
    };
  }
}
