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
  
  // Ignorar completamente rotas de API e recursos estáticos para evitar problemas
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('/api/auth/')) {
    return NextResponse.next()
  }
  
  // Verificar se é uma rota pública
  if (isPublicRoute(path)) {
    return NextResponse.next()
  }
  
  // Para rotas protegidas, verificar token
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    // Se não houver token e não for uma rota pública, redirecionar para login
    if (!token) {
      // Usar URL absoluta para evitar problemas com redirecionamentos relativos
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      
      return NextResponse.redirect(url)
    }
    
    // Se houver token, permitir acesso
    return NextResponse.next()
  } catch (error) {
    console.error("Erro no middleware:", error)
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