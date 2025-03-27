"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { BookPlus } from "lucide-react"

type AITrainingButtonProps = {
  className?: string
}

export function AITrainingButton({ className }: AITrainingButtonProps) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Conteúdo vazio",
        description: "Por favor, adicione algum conteúdo para treinamento.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/ai/training", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Falha ao enviar conteúdo de treinamento")
      }

      toast({
        title: "Conteúdo enviado",
        description: "Seu conteúdo foi enviado para treinamento da IA.",
      })

      setContent("")
      setOpen(false)
    } catch (error) {
      console.error("Erro ao enviar conteúdo de treinamento:", error)
      
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar conteúdo de treinamento",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className={className}
        onClick={() => setOpen(true)}
        title="Adicionar conhecimento para a IA"
      >
        <BookPlus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar conhecimento para a IA</DialogTitle>
            <DialogDescription>
              Adicione informações específicas do sistema para melhorar as respostas da IA.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Descreva processos, funcionalidades ou informações importantes do sistema..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px]"
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar para treinamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}