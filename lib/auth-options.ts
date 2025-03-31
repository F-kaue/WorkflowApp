import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

// Determina a URL base com base no ambiente
// IMPORTANTE: Esta URL deve corresponder exatamente à URL configurada no Google Cloud Console
// O erro redirect_uri_mismatch ocorre quando esta URL não corresponde à URL registrada no Google Cloud Console
// A URL de redirecionamento deve corresponder exatamente à URL registrada no Google Cloud Console
// Em desenvolvimento: http://localhost:3002/api/auth/callback/google
// Em produção: https://workfloowapp.vercel.app/api/auth/callback/google
const baseUrl = process.env.NEXTAUTH_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://workfloowapp.vercel.app" 
    : "http://localhost:3002")

export const authOptions: NextAuthOptions = {
  // Configuração explícita da URL base para redirecionamentos
  useSecureCookies: process.env.NODE_ENV === "production",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          // Configuração correta da URL de callback dentro dos parâmetros de autorização
          redirect_uri: `${baseUrl}/api/auth/callback/google`
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.sub
      }
      return session
    },
    async signIn({ user, account, profile, email, credentials }) {
      // Permitir o login e garantir que o redirecionamento funcione
      return true
    },
    async redirect({ url, baseUrl }) {
      // Garantir que o redirecionamento após o login funcione corretamente
      // Se a URL for relativa (começar com /), adicione a URL base
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // Se a URL já for absoluta e pertencer ao mesmo site, permita
      else if (url.startsWith(baseUrl)) {
        return url
      }
      // Caso contrário, redirecione para a página inicial
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Página de erro personalizada
  },
  // Configuração otimizada de cookies para ambiente de produção no Vercel
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Não definir domínio para permitir que o navegador use o domínio atual
        domain: undefined,
        // Reduzir o tempo de vida do cookie para evitar problemas de sessão
        maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
      },
    },
  },
}