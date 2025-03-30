"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { SessionProvider } from "next-auth/react"

type AuthContextType = {
  user: any
  loading: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchInterval={0}>{children}</SessionProvider>
}

export const useAuth = () => useContext(AuthContext)

