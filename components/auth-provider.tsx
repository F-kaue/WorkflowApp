"use client"

import type React from "react"
import { createContext, useContext } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
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

function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const loading = status === "loading"

  const login = () => {
    signIn("google", { callbackUrl: "/" })
  }

  const logout = () => {
    signOut({ callbackUrl: "/login" })
  }

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchInterval={0}>{children}</SessionProvider>
}

export const useAuth = () => useContext(AuthContext)

