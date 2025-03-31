import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Lista de rotas públicas que não requerem autenticação
const publicRoutes = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico'
]

// Função simplificada para verificar se uma rota é pública
function isPublicRoute(path: string): boolean {
  return publicRoutes.some(route => path.startsWith(route) || path.includes(route) || path.endsWith(route))
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  console.log(`[Middleware] Processando rota: ${path}, URL completa: ${request.nextUrl.toString()}`)
  
  // Ignorar completamente rotas de API e recursos estáticos para evitar problemas
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('/api/auth/')) {
    console.log(`[Middleware] Rota ignorada (API/estático): ${path}`)
    return NextResponse.next()
  }
  
  // Verificar se é uma rota pública
  if (isPublicRoute(path)) {
    console.log(`[Middleware] Rota pública permitida: ${path}`)
    
    // Se o usuário já está autenticado e tenta acessar a página de login, redirecionar para a home
    if (path === '/login') {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        })
        
        if (token) {
          console.log(`[Middleware] Usuário autenticado tentando acessar /login, redirecionando para /`)
          const url = request.nextUrl.clone()
          url.pathname = '/'
          url.search = ''
          return NextResponse.redirect(url)
        }
      } catch (error) {
        console.error("[Middleware] Erro ao verificar token na rota /login:", error)
      }
    }
    
    return NextResponse.next()
  }
  
  // Para rotas protegidas, verificar token
  try {
    console.log(`[Middleware] Verificando token para rota protegida: ${path}`)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    console.log(`[Middleware] Token encontrado: ${!!token}`)
    
    // Se não houver token e não for uma rota pública, redirecionar para login
    if (!token) {
      // Usar URL absoluta para evitar problemas com redirecionamentos relativos
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      
      console.log(`[Middleware] Redirecionando para login: ${url.toString()}`)
      return NextResponse.redirect(url)
    }
    
    // Se houver token, permitir acesso
    console.log(`[Middleware] Acesso permitido para rota protegida: ${path}`)
    return NextResponse.next()
  } catch (error) {
    console.error("[Middleware] Erro:", error)
    // Em caso de erro, permitir acesso para evitar loops
    return NextResponse.next()
  }
}

// Simplificar o matcher para incluir apenas as rotas necessárias
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}