// web/services/users.service.ts

import { httpClient } from "../lib/api/http-client";
import {
  UpdateUserInput,
  UpdatePasswordInput,
  UpdateRoleInput,
  UserResponse,
  UserStats,
} from "../types/index";

export const usersService = {
  // ==========================================
  // 👤 ROTAS DO USUÁRIO LOGADO
  // ==========================================

  /**
   * Busca o perfil do usuário atual
   */
  getProfile: async () => {
    return httpClient<{ user: UserResponse }>("/users/me", {
      method: "GET",
    });
  },

  /**
   * Atualiza dados cadastrais (nome, email)
   */
  updateProfile: async (data: UpdateUserInput) => {
    return httpClient<{ message: string; user: UserResponse }>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  /**
   * Altera a senha da conta
   */
  changePassword: async (data: UpdatePasswordInput) => {
    return httpClient<{ message: string }>("/users/me/password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Deleta a própria conta
   */
  deleteAccount: async () => {
    return httpClient<void>("/users/me", {
      method: "DELETE",
    });
  },

  // ==========================================
  // 👑 ROTAS DE ADMINISTRAÇÃO (Staff Only)
  // ==========================================

  /**
   * Lista todos os usuários cadastrados
   */
  listAll: async () => {
    return httpClient<{ users: UserResponse[] }>("/users", {
      method: "GET",
    });
  },

  /**
   * Altera o cargo (Role) de um usuário específico
   */
  updateRole: async (id: string, data: UpdateRoleInput) => {
    return httpClient<{ message: string; user: UserResponse }>(
      `/users/${id}/role`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  },

  /**
   * Deleta qualquer usuário do sistema à força
   */
  adminDelete: async (id: string) => {
    return httpClient<void>(`/users/${id}`, {
      method: "DELETE",
    });
  },

  /**
   * Busca estatísticas de usuários
   */
  getStats: async () => {
    return httpClient<UserStats>("/users/stats", {
      method: "GET",
    });
  },
};
