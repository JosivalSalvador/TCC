import { cookies } from "next/headers";
// Agora sim, usando o index centralizador da pasta types!
import { LoginResponse } from "../../types/index";

// Tipagem fortíssima: Extraímos exatamente o objeto 'user' gerado pelo Zod do servidor (que agora sabemos que inclui o 'id')
export type SessionUser = LoginResponse["user"];

const AUTH_COOKIE_NAME = "auth_session";
// O nome bate EXATAMENTE com o que o Fastify usa no seu cookie
const REFRESH_COOKIE_NAME = "refreshToken";

export async function setSession(
  token: string,
  refreshToken: string,
  user: SessionUser, // <- O TypeScript agora exige id, name, email e role estrito
) {
  const cookieStore = await cookies();

  // O SEGREDO DO SERVER: A sessão do frontend DEVE durar 7 dias para acompanhar o Refresh.
  // O token dentro dela expira em 1 dia no backend, forçando o http-client a renovar,
  // mas o Next.js não "esquece" quem é o usuário nesse meio tempo.
  cookieStore.set(AUTH_COOKIE_NAME, JSON.stringify({ token, user }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<{
  token: string;
  user: SessionUser;
} | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;

    if (!session) return null;

    return JSON.parse(session) as { token: string; user: SessionUser };
  } catch {
    return null;
  }
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}
