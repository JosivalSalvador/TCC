import { httpClient } from "../lib/api/http-client";
import { NicheInput, NicheResponse } from "../types/index";

export const nichesService = {
  /**
   * Lista todos os nichos do pool global
   * Usado para popular o dropdown (sem JWT)
   */
  listAll: async () => {
    return httpClient<{ niches: NicheResponse[] }>("/niches", {
      method: "GET",
    });
  },

  /**
   * Lista apenas os nichos vinculados ao usuário logado
   */
  listMine: async () => {
    return httpClient<{ niches: NicheResponse[] }>("/niches/me", {
      method: "GET",
    });
  },

  /**
   * Vincula um nicho à conta (cria no pool global se não existir)
   */
  addNiche: async (data: NicheInput) => {
    return httpClient<{ message: string; niche: NicheResponse }>("/niches/me", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Desvincula um nicho da conta pelo ID
   */
  removeNiche: async (id: string) => {
    return httpClient<void>(`/niches/me/${id}`, {
      method: "DELETE",
    });
  },
};
