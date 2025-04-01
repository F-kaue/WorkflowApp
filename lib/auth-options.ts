import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const baseUrl = process.env.NEXTAUTH_URL || 
  (process.env.NODE_ENV === "production" 
    ? "https://workfloowapp.vercel.app"  // URL corrigida (com três "o")
    : "http://localhost:3002")

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          redirect_uri: `${baseUrl}/api/auth/callback/google`,
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },

  debug: true, // Ativa logs detalhados do NextAuth

  // Logs personalizados para depuração
  logger: {
    error(code, metadata) {
      console.error("[NextAuth Error]", code, metadata)
    },
    warn(code) {
      console.warn("[NextAuth Warning]", code)
    },
    debug(code, metadata) {
      console.log("[NextAuth Debug]", code, metadata)
    },
  },

  callbacks: {
    async jwt({ token, account }) {
      console.log("[JWT Callback] Token:", token)
      if (account) {
        console.log("[JWT Callback] Account:", account)
        token.accessToken = account.access_token
      }
      return token
    },

    async session({ session, token }) {
      console.log("[Session Callback] Session:", session)
      console.log("[Session Callback] Token:", token)
      if (session.user) {
        session.user.id = token.sub
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      console.log("[Redirect Callback] URL:", url)
      console.log("[Redirect Callback] BaseURL:", baseUrl)
      return url.startsWith("/") ? `${baseUrl}${url}` : url
    },

    async signIn({ user, account, profile }) {
      console.log("[SignIn Callback] User:", user)
      console.log("[SignIn Callback] Account:", account)
      console.log("[SignIn Callback] Profile:", profile)
      return true
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" 
          ? ".workfloowapp.vercel.app" // Permite subdomínios
          : undefined,
      },
    },
  },
}