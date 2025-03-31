"use client"

import type React from "react"
import { createContext, useContext } from "react"

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

// Removendo o SessionProvider duplicado e usando apenas o provider global do app/providers.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export const useAuth = () => useContext(AuthContext)

