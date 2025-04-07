"use client"

import { useState } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

type TicketFeedbackProps = {
  ticketId: string
}

export function TicketFeedback({ ticketId }: TicketFeedbackProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [isPositive, setIsPositive] = useState<boolean | null>(null)
  const [feedbackComment, setFeedbackComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const { toast } = useToast()

  // Função para iniciar o processo de feedback
  const handleFeedbackStart = (positive: boolean) => {
    setIsPositive(positive)
    
    // Se for feedback positivo, podemos enviar diretamente
    if (positive) {
      submitFeedback("Ticket atendeu às expectativas")
    } else {
      // Se for negativo, mostrar formulário para detalhes
      setShowFeedbackForm(true)
    }
  }

  // Função para enviar o feedback
  const submitFeedback = async (comment: string = feedbackComment) => {
    if (!ticketId) {
      toast({
        title: "Erro",
        description: "ID do ticket não disponível",
        variant: "destructive",
      })
      return
    }

    if (isPositive === null) {
      toast({
        title: "Erro",
        description: "Por favor, indique se o ticket foi útil",
        variant: "destructive",
      })
      return
    }

    if (!isPositive && !comment.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, forneça detalhes sobre o que poderia ser melhorado",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ai/process-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId,
          isPositive,
          feedback: comment
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }))
        throw new Error(errorData.error || `Erro ${response.status}: Falha ao enviar feedback`)
      }

      const data = await response.json()

      toast({
        title: "Feedback enviado",
        description: data.message || "Obrigado pelo seu feedback!",
      })

      // Limpar o estado e marcar como enviado
      setFeedbackComment("")
      setShowFeedbackForm(false)
      setFeedbackSubmitted(true)
    } catch (error) {
      console.error("Erro ao enviar feedback:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Se o feedback já foi enviado, mostrar mensagem de agradecimento
  if (feedbackSubmitted) {
    return (
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Obrigado pelo seu feedback! Ele nos ajudará a melhorar nosso sistema.
      </div>
    )
  }

  return (
    <div className="mt-4">
      {!showFeedbackForm ? (
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm text-muted-foreground">Este ticket foi útil?</span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 flex items-center gap-1"
            onClick={() => handleFeedbackStart(true)}
            disabled={isSubmitting}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>Sim</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3 flex items-center gap-1"
            onClick={() => handleFeedbackStart(false)}
            disabled={isSubmitting}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>Não</span>
          </Button>
        </div>
      ) : (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Ajude-nos a melhorar</CardTitle>
            <CardDescription>
              O que poderia ser melhorado neste ticket?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Sua sugestão de melhoria..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                setShowFeedbackForm(false)
                setIsPositive(null)
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => submitFeedback()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enviando..." : "Enviar feedback"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}