"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)
  
  // Lógica de redirecionamento completamente reescrita para evitar loops
  useEffect(() => {
    // Registrar informações detalhadas para depuração
    const sessionInfo = {
      status,
      hasSession: !!session,
      isRedirecting,
      pathname: window.location.pathname
    }
    
    console.log("[LoginPage] Estado atual:", sessionInfo)
    
    // Só redirecionar se estiver autenticado, não estiver já redirecionando, e estiver na página de login
    if (status === "authenticated" && session && !isRedirecting && window.location.pathname === "/login") {
      console.log("[LoginPage] Autenticado na página de login, preparando redirecionamento")
      
      // Marcar que estamos redirecionando para evitar múltiplos redirecionamentos
      setIsRedirecting(true)
      
      // Usar um timeout maior para garantir que o estado seja atualizado antes do redirecionamento
      const redirectTimer = setTimeout(() => {
        console.log("[LoginPage] Executando redirecionamento para /")
        // Usar replace em vez de push para evitar problemas com o histórico de navegação
        router.replace("/")
      }, 1000) // Timeout maior para garantir que tudo seja processado
      
      // Limpar o timeout se o componente for desmontado
      return () => clearTimeout(redirectTimer)
    }
  }, [session, status, router, isRedirecting])
  
  const handleGoogleLogin = async () => {
    try {
      console.log("[LoginPage] Iniciando login com Google")
      await signIn("google", {
        callbackUrl: "/",
        redirect: false, // Mudando para false para controlar o redirecionamento manualmente
      })
    } catch (error) {
      console.error("[LoginPage] Erro ao fazer login:", error)
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
          {/* Informações de depuração visíveis */}
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto max-h-[100px] text-left mt-2">
            <p>Status: {status} | Redirecionando: {isRedirecting ? "Sim" : "Não"}</p>
            <p>Rota: {typeof window !== "undefined" ? window.location.pathname : ""}</p>
          </div>
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

