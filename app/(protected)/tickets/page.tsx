"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({})
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

  const getDescriptionFromMarkdown = (markdown: string | undefined) => {
    if (!markdown) return ""
    
    const lines = markdown.split("\n")
    const descriptionStart = lines.findIndex(line => line.trim().startsWith("## Descrição do Projeto"))
    
    if (descriptionStart === -1) return ""
    
    let description = ""
    for (let i = descriptionStart + 1; i < lines.length; i++) {
      if (lines[i].startsWith("##")) break
      description += lines[i] + "\n"
    }
    
    return description.trim()
  }

  const toggleExpand = (id: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
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

      <div className="grid gap-2">
        {tickets.map((ticket) => {
          const isExpanded = expandedTickets[ticket.id] || false
          const title = getTitleFromMarkdown(ticket.ticketGerado)
          const description = getDescriptionFromMarkdown(ticket.ticketGerado)
          
          return (
            <Card key={ticket.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">
                        {ticket.status}
                      </span>
                      <h3 className="font-medium">{title}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(ticket.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
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
                    </div>
                  </div>
                  {!isExpanded && description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              {isExpanded && (
                <CardContent className="border-t">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {ticket.ticketGerado || ""}
                    </ReactMarkdown>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm mt-4">
                    <span className="bg-muted px-2 py-1 rounded">
                      {ticket.dataCriacao ? (typeof ticket.dataCriacao === 'string' ? new Date(ticket.dataCriacao).toLocaleDateString() : new Date(ticket.dataCriacao?.seconds * 1000).toLocaleDateString()) : 'Data não disponível'}
                    </span>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}

        {tickets.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum ticket encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
