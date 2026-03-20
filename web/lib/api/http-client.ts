import { env } from "../utils/env";
import type { HttpError } from "../../types/index"; // <- Ajuste no caminho (raiz do projeto)
import {
  getSession,
  getRefreshToken,
  setSession,
  destroySession,
} from "../auth/session";

const getBaseUrl = () => {
  if (typeof window === "undefined") return env.API_INTERNAL_URL;
  return env.NEXT_PUBLIC_API_URL;
};

function getCookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

// === ADICIONADO: Variáveis de controle da Fila de Refresh ===
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
// ==========================================================

async function internalFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const apiPath = path.startsWith("/api/v1")
    ? path
    : `/api/v1${path.startsWith("/") ? "" : "/"}${path}`;
  const url = `${getBaseUrl()}${apiPath}`;

  const headers = new Headers(init?.headers);

  // --- AJUSTE DE MERCADO 1: Content-Type condicional e Stringify automático ---
  if (init?.body) {
    if (!(init.body instanceof FormData)) {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      if (typeof init.body === "object") {
        init.body = JSON.stringify(init.body);
      }
    }
  }

  if (typeof window === "undefined") {
    const session = await getSession();
    if (session?.token) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: init?.cache ?? "no-store",
  });

  const refreshPath = "/api/v1/token/refresh";

  // --- O BLOCO DO 401 ATUALIZADO COM A FILA ---
  if (response.status === 401 && !url.includes(refreshPath)) {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      // Se não tem ninguém renovando, eu assumo a responsabilidade!
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const refreshResponse = await fetch(
              `${getBaseUrl()}${refreshPath}`,
              {
                method: "PATCH",
                headers: {
                  Cookie: `refreshToken=${refreshToken}`,
                },
              },
            );

            if (refreshResponse.ok) {
              const { token: newAccessToken } = await refreshResponse.json();
              const setCookieHeader = refreshResponse.headers.get("set-cookie");
              const newRefreshTokenId =
                getCookieValue(setCookieHeader, "refreshToken") ?? refreshToken;

              const session = await getSession();

              if (session) {
                await setSession(
                  newAccessToken,
                  newRefreshTokenId,
                  session.user,
                );
              }
            } else {
              await destroySession();
              throw new Error("Refresh falhou");
            }
          } catch (error) {
            await destroySession();
            throw error;
          } finally {
            // Terminei! Libero a fila para a próxima.
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      // Todo mundo que deu 401 (incluindo o primeiro) espera a promessa terminar aqui
      try {
        await refreshPromise;

        // Terminou a espera! Pego o token novo da sessão e tento de novo!
        const session = await getSession();
        if (session?.token) {
          const retryHeaders = new Headers(headers);
          retryHeaders.set("Authorization", `Bearer ${session.token}`);
          return fetch(url, { ...init, headers: retryHeaders });
        } else {
          throw new Error("Sessão vazia");
        }
      } catch {
        throw {
          status: 401,
          message: "Sessão inválida.",
        } satisfies HttpError;
      }
    }
  }

  if (!response.ok) {
    let message = "Erro inesperado";
    try {
      const body = await response.json();
      message = body?.message ?? message;
    } catch {}

    throw {
      status: response.status,
      message,
    } satisfies HttpError;
  }

  return response;
}

export async function httpClient<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await internalFetch(path, init);

  // --- AJUSTE DE MERCADO 2: Tratamento de No Content ---
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export async function httpClientFull<T>(path: string, init?: RequestInit) {
  const response = await internalFetch(path, init);

  const data =
    response.status === 204 ? ({} as T) : ((await response.json()) as T);

  return { data, headers: response.headers };
}
