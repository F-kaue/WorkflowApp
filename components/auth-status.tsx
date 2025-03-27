"use client"

import { useSession } from "next-auth/react"
import { LoginButton } from "./login-button"
import { UserMenu } from "./user-menu"

export function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Carregando...</div>
  }

  if (!session) {
    return <LoginButton />
  }

  return <UserMenu />
}

