"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Bot, Send, ThumbsUp, ThumbsDown } from "lucide-react"
import { AITrainingButton } from "@/components/ai-training-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  feedback?: {
    rating?: number
    comment?: string
  }
}

export function AssistenteIAFullPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<Message | null>(null)
  const [feedbackComment, setFeedbackComment] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Sugestões de perguntas frequentes
  const suggestions = [
    "Como filtrar relatório por diretor?",
    "Como cadastrar um novo sindicalizador?",
    "Como gerar relatório de contribuições?",
    "Como atualizar dados de um associado?",
    "Como emitir um boleto?",
    "Como configurar permissões de usuário?"
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Salvar a mensagem do usuário no histórico
      await fetch("/api/ai/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input, role: "user" }),
      })

      // Criar um ID único para a mensagem do assistente
      const assistantMessageId = (Date.now() + 1).toString()
      
      // Adicionar uma mensagem vazia do assistente que será preenchida com o streaming
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date()
      }])

      // Configurar o streaming
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok || !response.body) {
        throw new Error("Falha ao obter resposta do assistente")
      }

      // Configurar o decoder para o streaming
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        accumulatedContent += text

        // Atualizar a mensagem do assistente com o conteúdo acumulado
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedContent }
            : msg
        ))
      }

      // Salvar a resposta completa no histórico
      await fetch("/api/ai/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message: accumulatedContent, 
          role: "assistant",
          messageId: assistantMessageId 
        }),
      })

    } catch (error) {
      console.error("Erro ao processar mensagem:", error)
      
      let errorMessage = "Não foi possível obter uma resposta. Tente novamente mais tarde."
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })

      // Remover a última mensagem do assistente se houver erro
      setMessages(prev => prev.filter(msg => msg.role !== "assistant" || msg.content !== ""))
    } finally {
      setIsLoading(false)
    }
  }, [input, toast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInput(suggestion)
  }, [])

  const handleFeedback = useCallback(async (message: Message, isPositive: boolean) => {
    const rating = isPositive ? 5 : 1

    // Atualizar o estado da mensagem com o feedback
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, feedback: { ...msg.feedback, rating } } 
          : msg
      )
    )

    // Se for feedback negativo, solicitar comentário
    if (!isPositive) {
      setFeedbackMessage(message)
      return
    }

    // Para feedback positivo, enviar direto
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: message.id,
          rating,
          comment: "",
          content: message.content
        }),
      })

      toast({
        title: "Feedback enviado",
        description: "Obrigado pelo seu feedback!",
      })
    } catch (error) {
      console.error("Erro ao enviar feedback:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: "Não foi possível enviar seu feedback. Tente novamente mais tarde.",
        variant: "destructive",
      })
    }
  }, [toast])

  const submitFeedbackComment = async () => {
    if (!feedbackMessage || !feedbackComment.trim()) return

    try {
      // Enviar feedback detalhado
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: feedbackMessage.id,
          rating: 1,
          comment: feedbackComment,
          content: feedbackMessage.content
        }),
      })

      if (!response.ok) {
        throw new Error("Falha ao enviar feedback")
      }

      // Enviar para o sistema de aprendizado
      await fetch("/api/ai/learn-from-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: feedbackMessage.id,
          rating: 1,
          comment: feedbackComment,
          content: feedbackMessage.content
        }),
      })

      toast({
        title: "Feedback enviado",
        description: "Obrigado pelo seu feedback! Vamos usar isso para melhorar.",
      })

      // Atualizar o estado da mensagem
      setMessages(prev => 
        prev.map(msg => 
          msg.id === feedbackMessage.id 
            ? { ...msg, feedback: { rating: 1, comment: feedbackComment } } 
            : msg
        )
      )

      // Limpar o estado de feedback
      setFeedbackMessage(null)
      setFeedbackComment("")
    } catch (error) {
      console.error("Erro ao enviar feedback:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: "Não foi possível enviar seu feedback. Tente novamente mais tarde.",
        variant: "destructive",
      })
    }
  }

  // Memoizar componentes para melhor performance
  const messageElements = useMemo(() => (
    <div className="space-y-6 max-w-4xl mx-auto">
      {messages.map((message) => (
        <div 
          key={message.id} 
          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div 
            className={`max-w-[80%] rounded-lg p-4 ${
              message.role === "user" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            }`}
          >
            <div className="whitespace-pre-wrap text-base leading-relaxed">
              {message.content}
            </div>
            
            {message.role === "assistant" && !message.feedback?.rating && (
              <div className="mt-3 flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground mr-1">
                  Esta resposta foi útil?
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 px-2 flex items-center gap-1"
                    onClick={() => handleFeedback(message, true)}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span>Sim</span>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 px-2 flex items-center gap-1"
                    onClick={() => handleFeedback(message, false)}
                  >
                    <ThumbsDown className="h-4 w-4" />
                    <span>Não</span>
                  </Button>
                </div>
              </div>
            )}
            
            {message.feedback?.rating && (
              <div className="mt-2 flex items-center justify-end">
                <span className="text-xs text-muted-foreground">
                  {message.feedback.rating >= 3 
                    ? "Obrigado pelo feedback positivo!" 
                    : "Obrigado pelo feedback."}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  ), [messages, handleFeedback])

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8 text-center">
            <div className="bg-primary/10 p-6 rounded-full">
              <Bot className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-3 max-w-lg">
              <h2 className="text-2xl font-semibold">Assistente IA do SindSystem</h2>
              <p className="text-muted-foreground text-lg">
                Olá! Estou aqui para ajudar com suas dúvidas sobre o sistema. 
                Como posso auxiliar você hoje?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
              {suggestions.map((suggestion) => (
                <Button 
                  key={suggestion} 
                  variant="outline" 
                  className="justify-start text-left h-auto py-3 px-4 text-base"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messageElements
        )}
      </div>

      {feedbackMessage && (
        <div className="p-6 border-t">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ajude-nos a melhorar</CardTitle>
              <CardDescription>
                O que poderia ser melhorado nesta resposta?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Sua sugestão de melhoria..." 
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setFeedbackMessage(null)
                  setFeedbackComment("")
                }}
              >
                Cancelar
              </Button>
              <Button onClick={submitFeedbackComment}>
                Enviar feedback
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      <div className="p-6 border-t">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <Input
            placeholder="Digite sua pergunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 text-base py-6"
          />
          <div className="flex items-center gap-2">
            <AITrainingButton className="mr-1" />
            <Button 
              onClick={handleSendMessage} 
              disabled={!input.trim() || isLoading}
              size="lg"
              className="px-6"
            >
              <Send className="h-5 w-5 mr-2" />
              <span>Enviar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}