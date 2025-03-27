"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, TicketIcon } from "lucide-react"
import Link from "next/link"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-8">Painel de Controle</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Agendamento de Treinamentos
            </CardTitle>
            <CardDescription>Agende e gerencie sessões de treinamento com participantes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Crie eventos de treinamento, adicione participantes e envie convites automáticos com links para Google
              Meet.
            </p>
            <Link href="/treinamentos">
              <Button>Acessar Treinamentos</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TicketIcon className="h-5 w-5 text-primary" />
              Tickets de Serviço
            </CardTitle>
            <CardDescription>Crie e gerencie tickets de serviço com processamento por IA</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Registre solicitações de clientes e utilize IA para estruturar e atribuir tarefas automaticamente à equipe
              apropriada.
            </p>
            <Link href="/tickets">
              <Button>Acessar Tickets</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

