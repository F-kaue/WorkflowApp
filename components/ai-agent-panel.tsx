"use client"

import { useState, useRef, useEffect } from "react"
import { Bot, Send, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
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

type AiAgentPanelProps = {
  onClose: () => void
}

export function AiAgentPanel({ onClose }: AiAgentPanelProps) {
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
    "Como atualizar dados de um associado?"
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
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
      
      // Enviar a pergunta para a API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Falha ao obter resposta do assistente")
      }

      // Clone a resposta para poder consumir o corpo duas vezes
      const responseClone = response.clone()
      const data = await responseClone.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      }

      setMessages((prev) => [...prev, assistantMessage])
      
      // Salvar a resposta do assistente no histórico
      await fetch("/api/ai/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: data.response, role: "assistant" }),
      })
    } catch (error) {
      console.error("Erro ao processar mensagem:", error)
      
      // Exibir mensagem de erro mais específica
      let errorMessage = "Não foi possível obter uma resposta. Tente novamente mais tarde."
      
      if (error instanceof Error) {
        // Usar a mensagem de erro específica se disponível
        errorMessage = error.message
      }
      
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
  }

  const handleFeedback = async (message: Message, rating: number) => {
    // Atualizar o estado da mensagem com o feedback
    setMessages(prev => 
      prev.map(msg => 
        msg.id === message.id 
          ? { ...msg, feedback: { ...msg.feedback, rating } } 
          : msg
      )
    )

    // Se a avaliação for baixa, solicitar comentário
    if (rating < 3) {
      setFeedbackMessage(message)
    } else {
      // Enviar feedback para a API
      try {
        await fetch("/api/ai/feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageId: message.id,
            rating,
            comment: ""
          }),
        })

        toast({
          title: "Feedback enviado",
          description: "Obrigado pelo seu feedback!",
        })
      } catch (error) {
        console.error("Erro ao enviar feedback:", error)
      }
    }
  }

  const submitFeedbackComment = async () => {
    if (!feedbackMessage) return

    // Atualizar o estado da mensagem com o comentário
    setMessages(prev => 
      prev.map(msg => 
        msg.id === feedbackMessage.id 
          ? { 
              ...msg, 
              feedback: { 
                ...msg.feedback, 
                comment: feedbackComment 
              } 
            } 
          : msg
      )
    )

    // Enviar feedback para a API
    try {
      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: feedbackMessage.id,
          rating: feedbackMessage.feedback?.rating,
          comment: feedbackComment
        }),
      })

      toast({
        title: "Feedback enviado",
        description: "Obrigado pelo seu feedback detalhado!",
      })

      // Limpar o estado de feedback
      setFeedbackMessage(null)
      setFeedbackComment("")
    } catch (error) {
      console.error("Erro ao enviar feedback detalhado:", error)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <SheetTitle>Assistente IA</SheetTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-semibold">Assistente IA do SindSystem</h3>
              <p className="text-muted-foreground">
                Olá! Estou aqui para ajudar com suas dúvidas sobre o sistema. 
                Como posso auxiliar você hoje?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {suggestions.map((suggestion) => (
                <Button 
                  key={suggestion} 
                  variant="outline" 
                  className="justify-start text-left h-auto py-2 px-3"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"}`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {message.role === "assistant" && !message.feedback?.rating && (
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Útil?</span>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button 
                          key={rating} 
                          onClick={() => handleFeedback(message, rating)}
                          className="text-muted-foreground hover:text-yellow-500 focus:outline-none"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {message.role === "assistant" && message.feedback?.rating && (
                    <div className="mt-2 flex items-center justify-end">
                      <span className="text-xs text-muted-foreground mr-1">Avaliação:</span>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < (message.feedback?.rating || 0) 
                            ? "text-yellow-500 fill-yellow-500" 
                            : "text-muted-foreground"}`} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-75" />
                <div className="h-2 w-2 bg-primary rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </div>
        )}
      </div>

      {feedbackMessage && (
        <div className="p-4 border-t">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ajude-nos a melhorar</CardTitle>
              <CardDescription>
                O que poderia ser melhorado nesta resposta?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea 
                placeholder="Sua sugestão de melhoria..." 
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="min-h-[80px]"
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

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua pergunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}