import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Ignorar rotas de API e recursos estáticos
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/') || path.startsWith('/_next/')) {
    return NextResponse.next()
  }

  // Obter o token da requisição
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Verificar se é a página de login
  const isAuthPage = path.startsWith("/login")

  // Se estiver na página de login e já estiver autenticado, redireciona para home
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Se não estiver na página de login e não estiver autenticado, redireciona para login
  if (!isAuthPage && !token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Caso contrário, continua normalmente
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match only these specific paths:
     * - / (home page)
     * - /login (login page)
     * - All routes under protected group
     */
    "/",
    "/login",
    "/(protected)/:path*"
  ],
}

