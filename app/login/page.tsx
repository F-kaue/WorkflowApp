"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  // Simplificando a lógica de redirecionamento para evitar loops
  useEffect(() => {
    if (status === "authenticated" && session && !isRedirecting) {
      setIsRedirecting(true)
      router.push("/")
    }
  }, [session, status, router, isRedirecting])

  const handleGoogleLogin = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/",
        redirect: true,
      })
    } catch (error) {
      console.error("Erro ao fazer login:", error)
    }
  }

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
        <Button
          className="w-full"
          onClick={handleGoogleLogin}
        >
          Entrar com Google
        </Button>
      </div>
    </div>
  )
}

