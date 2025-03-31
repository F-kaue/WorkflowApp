import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Verificar se a rota deve ser ignorada pelo middleware
  const path = request.nextUrl.pathname
  
  // Ignorar explicitamente todas as rotas de API e recursos estáticos
  // Isso é crucial para não interferir no fluxo de autenticação do NextAuth
  if (
    path.startsWith('/api/') || 
    path.startsWith('/_next/') || 
    path.includes('/api/auth/') ||
    path === '/favicon.ico' ||
    path.endsWith('.svg') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.includes('_buildManifest') ||
    path.includes('_ssgManifest')
  ) {
    return NextResponse.next()
  }
  
  // Verificar se a URL contém parâmetros de autenticação do Google
  // Se contiver, permitir o acesso sem verificação de token
  if (request.nextUrl.search.includes('code=') && request.nextUrl.search.includes('state=')) {
    return NextResponse.next()
  }

  try {
    // Obter o token da requisição com timeout para evitar bloqueios
    const tokenPromise = getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    // Adicionar timeout para evitar que a requisição fique presa
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Token request timeout')), 3000)
    })
    
    // Usar Promise.race para garantir que não ficará preso esperando o token
    const token = await Promise.race([tokenPromise, timeoutPromise])
      .catch(error => {
        console.error('Erro ao obter token:', error)
        return null
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
      // Não adicionar callbackUrl para evitar loops de redirecionamento
      return NextResponse.redirect(loginUrl)
    }

    // Caso contrário, continua normalmente
    return NextResponse.next()
  } catch (error) {
    console.error("Erro no middleware:", error)
    // Em caso de erro, permitir o acesso para evitar loops
    return NextResponse.next()
  }
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
    "/(protected)/:path*",
  ],
  // Importante: o matcher acima não inclui rotas de API, o que evita interferência
  // com o fluxo de autenticação do NextAuth
}

