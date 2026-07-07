import { httpClient } from "../lib/api/http-client";
import {
  CreateGenerationInput,
  FavoriteUpdateInput,
  GenerationResponse,
  GenerationStats,
  ListGenerationsQuery,
} from "../types/index";

export const generationsService = {
  /**
   * Chama o serviço de IA e persiste o resultado
   */
  create: async (data: CreateGenerationInput) => {
    return httpClient<{ message: string; generation: GenerationResponse }>(
      "/generations",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  /**
   * Lista todas as gerações do usuário
   * Passa ?favorite=true para alimentar a tela de Favoritos
   */
  listAll: async (query?: ListGenerationsQuery) => {
    const params =
      query?.favorite !== undefined ? `?favorite=${query.favorite}` : "";
    return httpClient<{ generations: GenerationResponse[] }>(
      `/generations${params}`,
      {
        method: "GET",
      },
    );
  },

  /**
   * Busca uma geração específica pelo ID
   */
  getById: async (id: string) => {
    return httpClient<{ generation: GenerationResponse }>(
      `/generations/${id}`,
      {
        method: "GET",
      },
    );
  },

  /**
   * Marca ou desmarca uma geração como favorita
   */
  updateFavorite: async (id: string, data: FavoriteUpdateInput) => {
    return httpClient<{ message: string; generation: GenerationResponse }>(
      `/generations/${id}/favorite`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  /**
   * Busca as estatísticas de gerações por nicho (Admin)
   */
  getStats: async () => {
    return httpClient<GenerationStats>("/generations/stats", {
      method: "GET",
    });
  },
};
