import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Rotas que SEMPRE devem ser públicas (incluindo assets)
const publicPaths = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts'
]

// Extensões de arquivo públicas
const publicExtensions = [
  '.svg', '.png', '.jpg', '.jpeg', 
  '.gif', '.ico', '.js', '.css', '.woff2'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestHeaders = new Headers(request.headers)

  // Debug inicial
  console.log(`\n[Middleware] Rota acessada: ${pathname}`)
  console.log(`[Middleware] Método: ${request.method}`)
  console.log(`[Middleware] Cookies: ${request.headers.get('cookie')?.length ? 'presentes' : 'ausentes'}`)

  // 1. Verificação de arquivos estáticos e rotas públicas explícitas
  if (
    publicPaths.some(path => pathname.startsWith(path)) ||
    publicExtensions.some(ext => pathname.endsWith(ext))
  ) {
    console.log(`[Middleware] Rota pública/estática permitida: ${pathname}`)
    return NextResponse.next()
  }

  // 2. Verificação especial para rotas de autenticação
  if (pathname.startsWith('/api/auth/')) {
    console.log(`[Middleware] Rota de autenticação permitida: ${pathname}`)
    
    // Garantir que headers necessários estejam presentes
    requestHeaders.set('x-middleware-request', 'auth-route')
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // 3. Prevenção de loops
  const redirectCount = parseInt(requestHeaders.get('x-redirect-count') || '0', 10)
  if (redirectCount > 2) {
    console.error('[Middleware] Loop detectado! Redirecionamentos:', redirectCount)
    return NextResponse.next()
  }

  // 4. Verificação de autenticação para rotas protegidas
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    })

    console.log(`[Middleware] Status de autenticação: ${token ? 'Autenticado' : 'Não autenticado'}`)

    if (!token) {
      if (pathname === '/login') {
        console.log('[Middleware] Já na página de login, evitando loop')
        return NextResponse.next()
      }

      console.log('[Middleware] Redirecionando para login')
      const loginUrl = new URL('/login', request.url)
      
      // Atualizar contador de redirecionamentos
      requestHeaders.set('x-redirect-count', (redirectCount + 1).toString())
      
      return NextResponse.redirect(loginUrl, {
        headers: requestHeaders
      })
    }

    // Usuário autenticado - permitir acesso
    return NextResponse.next()

  } catch (error) {
    console.error('[Middleware] Erro na verificação:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - API auth routes
     * - static files
     * - login page
     * - _next internals
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'
  ]
}