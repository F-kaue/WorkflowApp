import "next-auth"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    user: {
      email: string
      name: string
      image?: string
    }
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}

