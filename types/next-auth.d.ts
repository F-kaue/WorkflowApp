import "next-auth";
import type { DefaultSession, DefaultUser, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    user: {
      id?: string; // Adiciona um ID único para facilitar a identificação do usuário
      email: string;
      name: string;
      image?: string;
    } & DefaultSession["user"]; // Mantém compatibilidade com os dados padrão da sessão
  }

  interface User extends DefaultUser {
    id?: string; // ID do usuário para ser usado nas chamadas de API
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }

  interface JWT extends DefaultJWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  }
}
