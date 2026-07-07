// web/hooks/use-niches.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAllNichesAction,
  getMyNichesAction,
  addNicheAction,
  removeNicheAction,
  getNicheStatsAction,
} from "../actions/niches.actions";
import { NicheInput } from "../types/index";
import { toast } from "sonner";

// ==========================================
// 🔍 QUERIES
// ==========================================

export function useAllNiches() {
  return useQuery({
    queryKey: ["niches"],
    queryFn: () => getAllNichesAction(),
  });
}

export function useMyNiches() {
  return useQuery({
    queryKey: ["niches", "me"],
    queryFn: () => getMyNichesAction(),
  });
}

// ==========================================
// ✍️ MUTAÇÕES
// ==========================================

export function useNichesMutations() {
  const queryClient = useQueryClient();

  const addNiche = useMutation({
    mutationFn: async (data: NicheInput) => {
      const response = await addNicheAction(data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Nicho vinculado com sucesso!");
      // Atualiza tanto o pool global quanto os nichos do usuário
      queryClient.invalidateQueries({ queryKey: ["niches"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeNiche = useMutation({
    mutationFn: async (id: string) => {
      const response = await removeNicheAction(id);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      toast.success("Nicho removido da sua conta.");
      queryClient.invalidateQueries({ queryKey: ["niches"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    addNiche,
    removeNiche,
  };
}

export function useNicheStats() {
  return useQuery({
    queryKey: ["niches", "stats"],
    queryFn: () => getNicheStatsAction(),
  });
}
