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
    path.endsWith('.gif') ||
    path.endsWith('.ico') ||
    path.includes('_buildManifest') ||
    path.includes('_ssgManifest')
  )
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Detectar potencial loop de redirecionamento
  const redirectCount = parseInt(request.cookies.get('redirectCount')?.value || '0')
  if (redirectCount > 2) {
    // Se detectarmos mais de 2 redirecionamentos, interrompemos o ciclo
    const response = NextResponse.next()
    response.cookies.set('redirectCount', '0')
    return response
  }
  
  // 1. Ignorar rotas específicas
  if (shouldIgnoreRoute(path)) {
    return NextResponse.next()
  }
  
  // 2. Lidar com página de login
  if (path === '/login') {
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      })
      
      // Se estiver autenticado, redirecionar para home
      if (token) {
        const response = NextResponse.redirect(new URL('/', request.url))
        response.cookies.set('redirectCount', '0') // Reset contador
        return response
      }
    } catch (error) {
      console.error("Erro ao verificar token na página de login:", error)
    }
    
    // Se não estiver autenticado ou houver erro, permitir acesso à página de login
    return NextResponse.next()
  }
  
  // 3. Verificar autenticação para rotas protegidas (agora todas as rotas não-públicas)
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    // Se não estiver autenticado, redirecionar para login
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      // Adicionar callback URL como parâmetro para retornar após login
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname)
      
      // Incrementar contador de redirecionamentos para detectar loops
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set('redirectCount', String(redirectCount + 1))
      return response
    }
    
    // Reset contador se a navegação for bem-sucedida
    const response = NextResponse.next()
    response.cookies.set('redirectCount', '0')
    return response
    
  } catch (error) {
    console.error("Erro no middleware:", error)
    // Em caso de erro, evitar redirecionamento para prevenir loops
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/(dashboard|profile|settings|projects)/:path*', // Especifique suas rotas protegidas aqui
  ],
}