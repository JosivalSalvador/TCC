// web/hooks/use-users.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProfileAction,
  getUsersListAction,
  updateProfileAction,
  changePasswordAction,
  deleteAccountAction,
  updateRoleAction,
  adminDeleteUserAction,
} from "../actions/users.actions";
import {
  UpdateUserInput,
  UpdatePasswordInput,
  UpdateRoleInput,
} from "../types/index";
import { toast } from "sonner";

// ==========================================
// 🔍 QUERIES (Buscas Diretas via Actions)
// ==========================================

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfileAction(),
  });
}

export function useUsersList() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => getUsersListAction(),
  });
}

// ==========================================
// ✍️ MUTAÇÕES (Modificações via Actions)
// ==========================================

export function useUsersMutations() {
  const queryClient = useQueryClient();

  // ---- 👤 Mutações do Próprio Usuário ----

  const updateProfile = useMutation({
    mutationFn: async (data: UpdateUserInput) => {
      const response = await updateProfileAction(data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Perfil atualizado com sucesso!");
      // Força a recarga dos dados do perfil no Header/Sidebar
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const changePassword = useMutation({
    mutationFn: async (data: UpdatePasswordInput) => {
      const response = await changePasswordAction(data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Senha alterada com segurança!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const response = await deleteAccountAction();
      // Nota: o deleteAccountAction já faz um redirect('/login') no sucesso.
      // O código abaixo só é atingido se o backend recusar a deleção.
      if (response && !response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      // Como a sessão já foi destruída na action, a gente só joga o cara pro login
      // usando o window.location para forçar o recarregamento da página e passar pelo proxy
      window.location.href = "/login";
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // ---- 👑 Mutações Exclusivas do Admin ----

  const updateRole = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRoleInput }) => {
      const response = await updateRoleAction(id, data);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cargo atualizado com sucesso!");
      // Recarrega a tabela de usuários
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminDeleteUserAction(id);
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      toast.success("Usuário excluído com sucesso do sistema.");
      // Recarrega a tabela de usuários
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    updateProfile,
    changePassword,
    deleteAccount,
    updateRole,
    deleteUser,
  };
}
