import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Puxamos o seu Enum da raiz para tipagem forte e evitar erros de digitação
import { Role } from "./types/index";

const AUTH_COOKIE_NAME = "auth_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  let user = null;
  if (sessionCookie) {
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const session = JSON.parse(decoded);
      user = session.user;
    } catch {
      user = null;
    }
  }

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isAdminRoute = pathname.startsWith("/dashboard");
  const isAppRoute = pathname.startsWith("/home");
  const isRoot = pathname === "/";

  // 1. Usuário NÃO logado
  if (!user) {
    if (isAdminRoute || isAppRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Vitrine (/) e páginas públicas liberadas
    return NextResponse.next();
  }

  // 2. Usuário LOGADO
  // Validamos se ele faz parte da "Gestão" (Admin OU Supporter)
  const isManagement = user.role === Role.ADMIN || user.role === Role.SUPPORTER;

  // Destino base dependendo do cargo
  const dashboardUrl = isManagement ? "/dashboard" : "/home";

  if (isRoot) {
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Prevenção de loop: Logado tentando acessar Login/Register
  if (isAuthRoute) {
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // 3. Proteção de Rotas Base (Sincronizado com o Backend/Prisma)

  // Se for página de gestão, mas o usuário for apenas um cliente comum
  if (isAdminRoute && !isManagement) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Se for página de cliente, mas quem logou foi alguém da equipe
  if (isAppRoute && isManagement) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 4. 🛡️ PROTEÇÃO GRANULAR (O Leão de Chácara do Suporte)
  if (isAdminRoute && user.role === Role.SUPPORTER) {
    // Lista das rotas que o suporte NÃO pode acessar
    const isRestrictedForSupport =
      pathname.startsWith("/dashboard/products") ||
      pathname.startsWith("/dashboard/categories") ||
      pathname.startsWith("/dashboard/users");

    if (isRestrictedForSupport) {
      // Chuta de volta para o início do painel deles
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
