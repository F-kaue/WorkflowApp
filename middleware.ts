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
    path.includes('_ssgManifest') ||
    path.includes('accounts.google.com') ||
    path.includes('CheckConnection')
  )
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // 1. Ignorar rotas específicas
  if (shouldIgnoreRoute(path)) {
    return NextResponse.next()
  }
  
  // 2. Simplificar a lógica para evitar loops de redirecionamento
  try {
    // Verificar se é a página de login
    if (path === '/login') {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      })
      
      // Se já estiver autenticado na página de login, redirecionar para home
      if (token) {
        return NextResponse.redirect(new URL('/', request.url))
      }
      
      // Se não estiver autenticado, permitir acesso à página de login
      return NextResponse.next()
    }
    
    // 3. Para todas as outras rotas protegidas, verificar autenticação
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    
    // Se não estiver autenticado, redirecionar para login sem parâmetros adicionais
    // para evitar problemas com cookies e redirecionamentos
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Se estiver autenticado, permitir acesso
    return NextResponse.next()
  } catch (error) {
    console.error("Erro no middleware:", error)
    // Em caso de erro, permitir acesso para evitar loops
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