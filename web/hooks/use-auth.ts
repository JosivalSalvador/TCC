// web/hooks/use-auth.ts

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  loginAction,
  registerAction,
  logoutAction,
} from "../actions/auth.actions";
import { LoginInput, RegisterUserInput } from "../types/index";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await loginAction(data);
      // Se a Action devolveu success: false, forçamos um erro para o React Query capturar
      if (!response.success) throw new Error(response.error);
      return response;
    },
    onSuccess: () => {
      toast.success("Bem-vindo de volta!");
      // Jogamos para a raiz ("/"). O nosso proxy.ts vai interceptar instantaneamente,
      // ler o novo cookie e redirecionar pro /dashboard ou /home dependendo do cargo!
      router.push("/");
      router.refresh(); // Força o Next.js a revalidar a árvore de componentes
    },
    onError: (error: Error) => {
      // Exibe a mensagem exata do backend (ex: "Credenciais inválidas")
      toast.error(error.message);
    },
  });

  const register = useMutation({
    mutationFn: async (data: RegisterUserInput) => {
      const response = await registerAction(data);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Conta criada com sucesso! Faça login para continuar.");
      router.push("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      // O logoutAction já tem o redirect("/login") embutido no lado do servidor
      queryClient.clear();
      await logoutAction();
    },
    // Não precisamos de onSuccess aqui porque a Action já expulsa o usuário da tela
  });

  return {
    login,
    register,
    logout,
  };
}
