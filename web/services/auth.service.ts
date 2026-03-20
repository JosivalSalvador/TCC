import { getRefreshToken } from "@/lib/auth/session";
import { httpClient, httpClientFull } from "../lib/api/http-client";
import { LoginInput, LoginResponse, RegisterUserInput } from "../types/index";

export const authService = {
  /**
   * Realiza o Login e fisga o Refresh Token dos headers
   */
  login: async (data: LoginInput) => {
    const response = await httpClientFull<LoginResponse>("/sessions", {
      method: "POST",
      // O TypeScript exige uma string (BodyInit), então serializamos aqui
      body: JSON.stringify(data),
    });

    const setCookieHeader = response.headers.get("set-cookie");
    const match = setCookieHeader?.match(/refreshToken=([^;]+)/);
    const refreshToken = match ? match[1] : null;

    if (!refreshToken) {
      throw new Error("Refresh token não encontrado na resposta do servidor.");
    }

    return {
      token: response.data.token,
      user: response.data.user,
      refreshToken,
    };
  },

  /**
   * Registra um novo usuário no sistema
   */
  register: async (data: RegisterUserInput) => {
    return httpClient<{ message: string; userId: string }>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Invalida a sessão no backend
   */
  logout: async () => {
    const refreshToken = await getRefreshToken();
    return httpClient<void>("/sessions/logout", {
      method: "POST",
      headers: refreshToken
        ? { Cookie: `refreshToken=${refreshToken}` }
        : undefined,
    });
  },
};
