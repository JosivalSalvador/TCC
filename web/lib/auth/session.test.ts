import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setSession,
  getSession,
  getRefreshToken,
  destroySession,
  type SessionUser,
} from "./session";
import { Role } from "../../types/enums";

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    set: mockSet,
    get: mockGet,
    delete: mockDelete,
  })),
}));

describe("Auth: session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tipagem 100% estrita usando a própria interface do seu código
  const mockUser: SessionUser = {
    name: "Josival",
    email: "teste@teste.com",
    role: Role.ADMIN,
    // Nota: Se você adicionar o 'id' no Zod futuramente, o TypeScript
    // vai te avisar para colocar o 'id: "123"' aqui também!
  };

  it("deve salvar os dois cookies com validade de 7 dias", async () => {
    await setSession("meu-token", "meu-refresh", mockUser);

    expect(mockSet).toHaveBeenCalledTimes(2);
    expect(mockSet).toHaveBeenNthCalledWith(
      1,
      "auth_session",
      JSON.stringify({ token: "meu-token", user: mockUser }),
      expect.objectContaining({ maxAge: 604800, httpOnly: true }),
    );
    expect(mockSet).toHaveBeenNthCalledWith(
      2,
      "refreshToken",
      "meu-refresh",
      expect.objectContaining({ maxAge: 604800, httpOnly: true }),
    );
  });

  it("deve resgatar e parsear a sessão corretamente", async () => {
    mockGet.mockReturnValue({
      value: JSON.stringify({ token: "meu-token", user: mockUser }),
    });

    const session = await getSession();

    expect(mockGet).toHaveBeenCalledWith("auth_session");
    expect(session).toEqual({ token: "meu-token", user: mockUser });
  });

  it("deve retornar null se a sessão não existir ou o JSON estiver quebrado", async () => {
    mockGet.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();

    mockGet.mockReturnValue({ value: "isso-nao-e-um-json" });
    expect(await getSession()).toBeNull();
  });

  it("deve pegar apenas o refresh token", async () => {
    mockGet.mockReturnValue({ value: "token-de-refresh-aqui" });
    const token = await getRefreshToken();

    expect(mockGet).toHaveBeenCalledWith("refreshToken");
    expect(token).toBe("token-de-refresh-aqui");
  });

  it("deve destruir os dois cookies ao deslogar", async () => {
    await destroySession();

    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockDelete).toHaveBeenCalledWith("auth_session");
    expect(mockDelete).toHaveBeenCalledWith("refreshToken");
  });
});
