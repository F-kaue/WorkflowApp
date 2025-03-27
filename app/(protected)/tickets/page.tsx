"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

type Ticket = {
  id: string
  sindicato: string
  solicitacaoOriginal: string
  ticketGerado: string
  status: string
  dataCriacao: any
}

export default function TicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/tickets")
      if (!response.ok) {
        throw new Error("Erro ao carregar tickets")
      }
      const data = await response.json()
      setTickets(data)
    } catch (error) {
      console.error("Erro ao carregar tickets:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar tickets",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch("/api/tickets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir ticket")
      }

      await fetchTickets()
      toast({
        title: "Sucesso",
        description: "Ticket excluído com sucesso",
      })
    } catch (error) {
      console.error("Erro ao excluir ticket:", error)
      toast({
        title: "Erro",
        description: "Erro ao excluir ticket",
        variant: "destructive",
      })
    }
  }

  const getTitleFromMarkdown = (markdown: string | undefined) => {
    if (!markdown) return "Sem título"
    
    const lines = markdown.split("\n")
    const titleLine = lines.find(line => line.trim().startsWith("# "))
    return titleLine ? titleLine.replace("# ", "").trim() : "Sem título"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tickets</h1>
        <Button onClick={() => router.push("/tickets/novo")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Ticket
        </Button>
      </div>

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-bold">
                {getTitleFromMarkdown(ticket.ticketGerado)}
              </CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Ticket</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(ticket.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {ticket.ticketGerado || ""}
                  </ReactMarkdown>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                    {ticket.status}
                  </span>
                  <span className="bg-muted px-2 py-1 rounded">
                    {ticket.dataCriacao ? (typeof ticket.dataCriacao === 'string' ? new Date(ticket.dataCriacao).toLocaleDateString() : new Date(ticket.dataCriacao?.seconds * 1000).toLocaleDateString()) : 'Data não disponível'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tickets.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum ticket encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
