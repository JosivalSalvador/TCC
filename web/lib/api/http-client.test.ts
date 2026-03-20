import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { httpClient, httpClientFull } from "./http-client";
import {
  getSession,
  getRefreshToken,
  setSession,
  destroySession,
} from "../auth/session";
import { Role } from "../../types/enums"; // <- Importando o Enum verdadeiro para tipagem exata

// 1. Mock das variáveis de ambiente
vi.mock("../utils/env", () => ({
  env: {
    API_INTERNAL_URL: "http://internal-api",
    NEXT_PUBLIC_API_URL: "http://public-api",
  },
}));

// 2. Mock das funções de sessão
vi.mock("../auth/session", () => ({
  getSession: vi.fn(),
  getRefreshToken: vi.fn(),
  setSession: vi.fn(),
  destroySession: vi.fn(),
}));

// 3. Espião para a função global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("API: http-client", () => {
  const originalWindow = global.window;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it("deve fazer um GET simples e injetar /api/v1 na URL", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: "ok" }), { status: 200 }),
    );

    const response = await httpClient<{ data: string }>("/test");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/test");
    expect(response).toEqual({ data: "ok" });
  });

  it("deve converter o body em string e adicionar Content-Type se não for FormData", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await httpClient("/test", {
      method: "POST",
      body: { name: "Josival" } as unknown as BodyInit,
    });

    const configUsada = fetchMock.mock.calls[0][1];
    expect(configUsada.body).toBe('{"name":"Josival"}');

    const headers = new Headers(configUsada.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("deve injetar o token Bearer no servidor (window === undefined)", async () => {
    // @ts-expect-error - Manipulando global para simular SSR
    delete global.window;

    vi.mocked(getSession).mockResolvedValueOnce({
      token: "meu-token-jwt",
      // Usando o Role estrito aqui!
      user: { name: "Josival", email: "teste@teste.com", role: Role.ADMIN },
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
    );

    await httpClient("/test");

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get("Authorization")).toBe("Bearer meu-token-jwt");
  });

  it("deve retornar um objeto vazio ao receber status 204 (No Content)", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const response = await httpClient("/delete-alguma-coisa");

    expect(response).toEqual({});
  });

  it("deve disparar erro padronizado (HttpError) quando a API retorna erro genérico", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Recurso não encontrado" }), {
        status: 404,
      }),
    );

    const promise = httpClient("/nao-existe");

    await expect(promise).rejects.toEqual({
      status: 404,
      message: "Recurso não encontrado",
    });
  });

  // TESTE ADICIONADO PARA O httpClientFull
  it("deve retornar os dados junto com os headers ao usar httpClientFull", async () => {
    const fakeHeaders = new Headers();
    fakeHeaders.set("x-total-count", "100");

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ items: [1, 2, 3] }), {
        status: 200,
        headers: fakeHeaders,
      }),
    );

    const response = await httpClientFull("/test-full");

    expect(response.data).toEqual({ items: [1, 2, 3] });
    expect(response.headers.get("x-total-count")).toBe("100");
  });

  describe("Fila de Refresh Token (Interceptador 401)", () => {
    it("deve renovar o token e refazer a requisição original se der 401", async () => {
      vi.mocked(getRefreshToken).mockResolvedValueOnce("refresh-token-velho");

      const sessionMock = {
        token: "token-novo",
        // Usando o Role estrito aqui também!
        user: { name: "Josival", email: "a@a.com", role: Role.ADMIN },
      };

      vi.mocked(getSession)
        .mockResolvedValueOnce(sessionMock)
        .mockResolvedValueOnce(sessionMock);

      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ token: "token-novo" }), {
            status: 200,
          }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ sucesso: true }), { status: 200 }),
        );

      const response = await httpClient("/rota-protegida");

      expect(response).toEqual({ sucesso: true });
      expect(fetchMock).toHaveBeenCalledTimes(3);

      expect(setSession).toHaveBeenCalledWith(
        "token-novo",
        "refresh-token-velho",
        sessionMock.user,
      );
    });

    it("deve destruir a sessão se a tentativa de refresh falhar", async () => {
      vi.mocked(getRefreshToken).mockResolvedValueOnce("refresh-token-velho");

      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(new Response(null, { status: 400 }));

      const promise = httpClient("/rota-protegida");

      await expect(promise).rejects.toEqual({
        status: 401,
        message: "Sessão inválida.",
      });

      expect(destroySession).toHaveBeenCalledTimes(2);
    });
  });
});
