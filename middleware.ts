import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Função para verificar se a rota deve ser ignorada pelo middleware
function shouldIgnoreRoute(path: string): boolean {
  return (
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
  )
}

// Função para verificar se a URL está relacionada ao fluxo de autenticação
function isAuthRelatedUrl(url: URL): boolean {
  const authParams = ['code', 'state', 'error', 'callback']
  return authParams.some(param => url.searchParams.has(param)) ||
         url.pathname.includes('/api/auth/') ||
         url.pathname.includes('/auth/')
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // 1. Ignorar rotas específicas (API, recursos estáticos, etc)
  if (shouldIgnoreRoute(path)) {
    return NextResponse.next()
  }
  
  // 2. Permitir acesso a URLs relacionadas ao fluxo de autenticação
  if (isAuthRelatedUrl(request.nextUrl)) {
    return NextResponse.next()
  }

  try {
    // 3. Obter o token de autenticação
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    // 4. Lógica de redirecionamento baseada no token e no caminho
    
    // Caso 1: Usuário na página de login, mas já está autenticado
    if (path === '/login' && token) {
      // Redirecionar para a página inicial ou para o callbackUrl se existir
      const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
      // Verificar se o callbackUrl não é a própria página de login para evitar loops
      const redirectUrl = callbackUrl && !callbackUrl.includes('/login') ? callbackUrl : '/'
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
    
    // Caso 2: Usuário tentando acessar rota protegida sem autenticação
    if (!token && path !== '/login') {
      // Redirecionar para a página de login
      const loginUrl = new URL('/login', request.url)
      // Adicionar callbackUrl apenas se não for uma rota de API e não for a própria página de login
      if (!path.startsWith('/api/')) {
        loginUrl.searchParams.set('callbackUrl', request.url)
      }
      // Adicionar timestamp para evitar cache
      loginUrl.searchParams.set('t', Date.now().toString())
      return NextResponse.redirect(loginUrl)
    }
    
    // Caso 3: Usuário autenticado acessando rota permitida ou usuário não autenticado acessando login
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

