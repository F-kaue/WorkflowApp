"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

type Treinamento = {
  id: string
  titulo: string
  descricao: string
  sindicato: string
  dataInicio: any
  dataFim: any
  status: string
  dataCriacao: any
}

export default function TreinamentosPage() {
  const router = useRouter()
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchTreinamentos()
  }, [])

  const fetchTreinamentos = async () => {
    try {
      const response = await fetch("/api/treinamentos")
      if (!response.ok) {
        throw new Error("Erro ao carregar treinamentos")
      }
      const data = await response.json()
      setTreinamentos(data)
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/treinamentos/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Erro ao excluir treinamento")
      }

      await fetchTreinamentos()
    } catch (error) {
      console.error("Erro ao excluir treinamento:", error)
    }
  }

  const formatDateTime = (date: any) => {
    if (!date) return ""
    try {
      let timestamp;
      if (date.seconds) {
        // Formato do Firestore Timestamp
        timestamp = new Date(date.seconds * 1000)
      } else if (date instanceof Date) {
        // Já é um objeto Date
        timestamp = date
      } else if (typeof date === 'string') {
        // String de data
        timestamp = new Date(date)
      } else {
        return ""
      }
      return format(timestamp, "dd/MM/yyyy - HH:mm", { locale: ptBR })
    } catch (error) {
      console.error("Erro ao formatar data e hora:", error)
      return ""
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedTickets(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Treinamentos</h1>
        <Button onClick={() => router.push("/treinamentos/novo")}>
          <Plus className="mr-2 h-4 w-4" /> Novo Treinamento
        </Button>
      </div>

      <div className="grid gap-2">
        {treinamentos.map((treinamento) => {
          const isExpanded = expandedTickets[treinamento.id] || false
          
          return (
            <Card key={treinamento.id} className="overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleExpand(treinamento.id)}>
                <div className="flex items-center space-x-3">
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">
                    {treinamento.status}
                  </span>
                  <h3 className="font-medium text-sm">{treinamento.titulo}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(treinamento.dataInicio)}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                    e.stopPropagation()
                    toggleExpand(treinamento.id)
                  }}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Treinamento</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este treinamento? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(treinamento.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "max-h-40" : "max-h-0"
              )}>
                <CardContent className="pt-2 pb-3">
                  <p className="text-sm">{treinamento.descricao}</p>
                </CardContent>
              </div>
            </Card>
          )
        })}

        {treinamentos.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum treinamento encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
