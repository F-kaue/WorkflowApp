// src/middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Definição de rotas públicas
const publicRoutes = [
  "/",
  "/login",
  "/auth/signin",
  "/auth/signout",
  "/auth/error",
  "/auth/verify-request",
  "/auth/new-user",
  "/api/auth",
  "/api/auth/callback/google",
  "/api/",
  "/_next",
  "/favicon.ico",
];

// Extensões de arquivos públicos (recursos estáticos)
const publicExtensions = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".js",
  ".css",
  ".woff2",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);

  // Se a rota for pública ou um recurso estático, permite a requisição
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    publicExtensions.some((ext) => pathname.endsWith(ext)) ||
    pathname.startsWith("/api/auth/") || // Permitir todas as rotas de autenticação da API
    pathname.startsWith("/api/") || // Permitir todas as rotas de API
    pathname.includes("/_next/") ||
    pathname.includes("/static/") ||
    pathname.includes("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Verificar a presença do cookie de sessão para evitar chamadas desnecessárias ao getToken
  const sessionCookie = request.cookies.get(
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"
  );

  if (!sessionCookie) {
    return redirectToLogin(request);
  }

  try {
    // Obtém o token JWT para verificar autenticação
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
    });

    // Se não há token válido, redirecionar para login
    if (!token) {
      return redirectToLogin(request);
    }

    // Se autenticado e tentando acessar login/signin, redireciona para home
    if (pathname === "/login" || pathname.startsWith("/auth/signin")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Adiciona informações do usuário nos headers
    requestHeaders.set("x-user-id", token.sub || "");
    requestHeaders.set("x-user-email", token.email || "");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Erro no middleware:", error);
    return redirectToError(request);
  }
}

// Função auxiliar para redirecionar ao login com callbackUrl
function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", encodeURIComponent(request.url));
  return NextResponse.redirect(loginUrl);
}

// Função auxiliar para redirecionar à página de erro
function redirectToError(request: NextRequest) {
  const errorUrl = new URL("/auth/error", request.url);
  errorUrl.searchParams.set("error", "MiddlewareError");
  return NextResponse.redirect(errorUrl);
}

// Configuração do matcher para aplicar o middleware corretamente
export const config = {
  matcher: [
    "/((?!api/auth/|api/|_next/|static/|favicon.ico).*)",
  ],
};
