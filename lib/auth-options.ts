import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  // Configuração explícita da URL base para redirecionamentos
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://'),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
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
  },
  pages: {
    signIn: "/login",
    error: "/login", // Página de erro personalizada
  },
  // Configuração explícita de URLs para garantir redirecionamentos corretos
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
}