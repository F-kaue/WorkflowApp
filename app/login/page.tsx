"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoginButton } from "@/components/login-button"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  // Lógica de redirecionamento simplificada
  useEffect(() => {
    // Se o usuário estiver autenticado, redirecionar para a página inicial
    if (status === "authenticated" && session) {
      router.replace("/")
    }
  }, [session, status, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-[350px] space-y-6">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Bem-vindo ao WorkflowApp
          </h1>
          <p className="text-sm text-muted-foreground">
            Faça login para acessar o sistema
          </p>
        </div>
        <LoginButton />
      </div>
    </div>
  )
}

