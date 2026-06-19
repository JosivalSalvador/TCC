// web/hooks/use-generations.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getGenerationsAction,
  getGenerationByIdAction,
  createGenerationAction,
  updateFavoriteAction,
} from "../actions/generations.actions";
import {
  CreateGenerationInput,
  FavoriteUpdateInput,
  ListGenerationsQuery,
} from "../types/index";
import { toast } from "sonner";

// ==========================================
// 🔍 QUERIES
// ==========================================

export function useGenerations(query?: ListGenerationsQuery) {
  return useQuery({
    queryKey: ["generations", query],
    queryFn: () => getGenerationsAction(query),
  });
}

export function useGeneration(id: string) {
  return useQuery({
    queryKey: ["generations", id],
    queryFn: () => getGenerationByIdAction(id),
    enabled: !!id,
  });
}

// ==========================================
// ✍️ MUTAÇÕES
// ==========================================

export function useGenerationsMutations() {
  const queryClient = useQueryClient();

  const createGeneration = useMutation({
    mutationFn: async (data: CreateGenerationInput) => {
      const response = await createGenerationAction(data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      toast.success("Conteúdo gerado com sucesso!");
      // Invalida o histórico para a nova geração aparecer
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateFavorite = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: FavoriteUpdateInput;
    }) => {
      const response = await updateFavoriteAction(id, data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      const isFavorite = data.data?.generation.isFavorite;
      toast.success(
        isFavorite ? "Adicionado aos favoritos!" : "Removido dos favoritos.",
      );
      // Invalida histórico e favoritos
      queryClient.invalidateQueries({ queryKey: ["generations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    createGeneration,
    updateFavorite,
  };
}
