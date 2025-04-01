import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 horas
  },

  debug: process.env.NODE_ENV !== "production", // Debug apenas em desenvolvimento

  logger: {
    error(code, metadata) {
      console.error("[NextAuth Error]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth Warning]", code);
    },
    debug(code, metadata) {
      console.log("[NextAuth Debug]", code, metadata);
    },
  },

  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token ?? "";
        token.refreshToken = account.refresh_token ?? "";
        token.expiresAt = Math.floor(Date.now() / 1000) + Number(account.expires_in ?? 3600);
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.accessToken = String(token.accessToken ?? "");
        session.refreshToken = String(token.refreshToken ?? "");
        session.expiresAt = Number(token.expiresAt ?? 0);
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      return url.startsWith("/") ? `${baseUrl}${url}` : url;
    },

    async signIn({ account }) {
      return !!account?.access_token;
    },
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production"
          ? ".workfloowapp.vercel.app"
          : undefined,
      },
    },
  },
};
