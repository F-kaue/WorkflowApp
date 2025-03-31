import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Lista de rotas públicas que não requerem autenticação
const publicRoutes = [
  '/login',
  '/api/auth',
  '/auth',
  '/callback',
  '/_next',
  '/favicon.ico',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.js',
  '.css',
  // Adicionar rotas específicas de autenticação do Google
  '/api/auth/signin',
  '/api/auth/callback',
  '/api/auth/signout',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers'
]

// Função melhorada para verificar se uma rota é pública
function isPublicRoute(path: string): boolean {
  // Verificar explicitamente rotas de autenticação (verificação mais abrangente)
  if (path.includes('/api/auth') || path.includes('/auth') || path.includes('/callback') || path === '/login') {
    console.log(`[Middleware] Rota de autenticação detectada como pública: ${path}`)
    return true
  }
  
  // Verificar outras rotas públicas
  const isPublic = publicRoutes.some(route => path.startsWith(route) || path.includes(route) || path.endsWith(route))
  
  if (isPublic) {
    console.log(`[Middleware] Rota pública detectada via lista: ${path}`)
  }
  
  return isPublic
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  console.log(`[Middleware] Processando rota: ${path}, URL completa: ${request.nextUrl.toString()}`)
  
  // Verificar se já estamos em um loop de redirecionamento
  const redirectCount = request.headers.get('x-redirect-count') || '0'
  const count = parseInt(redirectCount, 10)
  
  // Aumentar a tolerância para loops em produção
  const maxRedirects = process.env.NODE_ENV === 'production' ? 3 : 2
  
  if (count > maxRedirects) {
    console.log(`[Middleware] Detectado possível loop de redirecionamento (${count}), permitindo acesso`)
    console.log(`[Middleware] Ambiente: ${process.env.NODE_ENV}, URL: ${request.nextUrl.toString()}`)
    return NextResponse.next()
  }
  
  // Ignorar completamente rotas de API e recursos estáticos para evitar problemas
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.includes('.')) {
    console.log(`[Middleware] Rota ignorada (API/estático): ${path}`)
    return NextResponse.next()
  }
  
  // Verificar explicitamente todas as rotas relacionadas à autenticação
  // Usar uma verificação mais abrangente para garantir que todas as rotas de autenticação sejam ignoradas
  if (path.includes('/api/auth') || path.includes('/auth') || path.includes('/callback') || path === '/login') {
    console.log(`[Middleware] Rota de autenticação ignorada: ${path}`)
    return NextResponse.next()
  }
  
  // Verificar se é uma rota pública
  if (isPublicRoute(path)) {
    console.log(`[Middleware] Rota pública permitida: ${path}`)
    return NextResponse.next()
  }
  
  // Para rotas protegidas, verificar token
  try {
    console.log(`[Middleware] Verificando token para rota protegida: ${path}, Ambiente: ${process.env.NODE_ENV}`)
    
    // Adicionar mais informações de debug para ajudar a diagnosticar problemas
    console.log(`[Middleware] NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'não definido'}`)
    console.log(`[Middleware] Cookies presentes: ${request.headers.get('cookie') ? 'Sim' : 'Não'}`)
    
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
      
      // Verificar se já estamos na página de login para evitar loops
      if (path === '/login') {
        console.log(`[Middleware] Já estamos na página de login, permitindo acesso para evitar loop`)
        return NextResponse.next()
      }
      
      // Garantir que a URL seja absoluta em produção
      if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL) {
        // Usar URL base configurada para garantir redirecionamentos corretos
        const baseUrl = new URL(process.env.NEXTAUTH_URL)
        url.host = baseUrl.host
        url.protocol = baseUrl.protocol
        url.port = baseUrl.port || ''
      }
      
      console.log(`[Middleware] Redirecionando para login: ${url.toString()}`)
      const response = NextResponse.redirect(url)
      
      // Incrementar contador de redirecionamentos para detectar loops
      response.headers.set('x-redirect-count', (count + 1).toString())
      
      return response
    }
    
    // Se houver token, permitir acesso
    console.log(`[Middleware] Acesso permitido para rota protegida: ${path}`)
    return NextResponse.next()
  } catch (error) {
    console.error("[Middleware] Erro:", error)
    console.log(`[Middleware] Erro ao processar rota ${path} em ambiente ${process.env.NODE_ENV}`)
    // Em caso de erro, permitir acesso para evitar loops
    return NextResponse.next()
  }
}

// Configuração mais precisa do matcher para evitar problemas com rotas de autenticação
export const config = {
  matcher: [
    // Excluir explicitamente todas as rotas relacionadas à autenticação e recursos estáticos
    // Adicionar mais exclusões para garantir que todas as rotas de autenticação sejam ignoradas
    '/((?!api\/auth|auth|callback|login|_next\/static|_next\/image|favicon\.ico|.*\.(?:svg|png|jpg|jpeg|gif|ico)).*)',
  ],
}