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

  // Memoizar a função de envio para evitar recriações desnecessárias
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

      // Enviar a pergunta para a API com AbortController para cancelar requisições pendentes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Verificar o tipo de conteúdo da resposta
      const contentType = response.headers.get("content-type") || ""
      console.log("Tipo de conteúdo da resposta:", contentType)
      
      if (!response.ok) {
        // Verificar se a resposta é HTML (erro 500 do servidor)
        if (contentType.includes("text/html")) {
          const htmlText = await response.text()
          console.error("Recebido HTML em vez de JSON:", htmlText.substring(0, 200))
          throw new Error("Erro interno do servidor. Por favor, tente novamente mais tarde.")
        }
        
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || "Falha ao obter resposta do assistente")
        } catch (jsonError) {
          console.error("Erro ao processar resposta de erro:", jsonError)
          throw new Error("Erro ao processar resposta do servidor")
        }
      }

      // Verificar se o conteúdo é realmente JSON antes de fazer o parsing
      if (!contentType.includes("application/json")) {
        console.error("Resposta não é JSON. Tipo de conteúdo:", contentType)
        const textContent = await response.text()
        console.error("Conteúdo da resposta não-JSON:", textContent.substring(0, 200))
        throw new Error("Formato de resposta inválido do servidor")
      }
      
      // Tentar fazer o parsing do JSON com tratamento de erro
      let data
      try {
        data = await response.json()
        console.log("Dados JSON recebidos com sucesso")
      } catch (jsonError) {
        console.error("Erro ao fazer parsing do JSON:", jsonError)
        throw new Error("Erro ao processar resposta do servidor")
      }

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

  // Memoizar a função de feedback para evitar recriações desnecessárias
  const handleFeedback = useCallback(async (message: Message, rating: number) => {
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
      
      // Mesmo para avaliações baixas, enviar o feedback inicial para o sistema
      // Isso permite que o sistema comece a processar o feedback negativo imediatamente
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
            isNegativeFeedback: true // Indicador de feedback negativo
          }),
        })
        // Não exibimos toast aqui pois ainda vamos solicitar o comentário detalhado
      } catch (error) {
        console.error("Erro ao enviar feedback inicial negativo:", error)
        // Não exibimos toast de erro aqui para não interromper o fluxo de feedback
      }
    } else {
      // Enviar feedback para a API com melhor tratamento de erros
      try {
        const response = await fetch("/api/ai/feedback", {
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
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new Error(errorData.error || `Erro ${response.status}: Falha ao enviar feedback`);
        }
        
        const data = await response.json();

        toast({
          title: "Feedback enviado",
          description: data.message || "Obrigado pelo seu feedback!",
        })
      } catch (error) {
        console.error("Erro ao enviar feedback:", error)
        toast({
          title: "Erro ao enviar feedback",
          description: error instanceof Error ? error.message : "Tente novamente mais tarde",
          variant: "destructive",
        })
      }
    }
  }, [toast])

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

    // Enviar feedback detalhado para a API com melhor tratamento de erros
    try {
      // Verificar se o rating existe, caso contrário usar um valor padrão (1 para feedback negativo)
      const rating = feedbackMessage.feedback?.rating || 1;
      
      console.log("Enviando feedback detalhado com rating:", rating);
      
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId: feedbackMessage.id,
          rating: rating, // Usar o rating verificado
          comment: feedbackComment,
          isNegativeFeedback: true, // Indicador de feedback negativo
          isDetailedFeedback: true  // Indicador de feedback detalhado
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(errorData.error || `Erro ${response.status}: Falha ao enviar feedback detalhado`);
      }
      
      const data = await response.json();

      // Após enviar o feedback detalhado, também enviar para a API de aprendizado
      try {
        // Usar o mesmo rating verificado para a API de aprendizado
        await fetch("/api/ai/learn-from-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messageId: feedbackMessage.id,
            rating: rating, // Usar o rating verificado anteriormente
            comment: feedbackComment,
            content: feedbackMessage.content
          }),
        });
        console.log("Feedback enviado para aprendizado");
      } catch (learnError) {
        console.error("Erro ao enviar feedback para aprendizado:", learnError);
        // Não interrompemos o fluxo principal se o aprendizado falhar
      }

      toast({
        title: "Feedback enviado",
        description: data.message || "Obrigado pelo seu feedback! Vamos usar isso para melhorar.",
      })

      // Limpar o estado de feedback
      setFeedbackMessage(null)
      setFeedbackComment("")
    } catch (error) {
      console.error("Erro ao enviar feedback detalhado:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde",
        variant: "destructive",
      })
    }
  }

  // Memoizar a lista de sugestões para evitar recriações desnecessárias
  const suggestionButtons = useMemo(() => {
    return suggestions.map((suggestion) => (
      <Button 
        key={suggestion} 
        variant="outline" 
        className="justify-start text-left h-auto py-3 px-4 text-base"
        onClick={() => handleSuggestionClick(suggestion)}
      >
        {suggestion}
      </Button>
    ));
  }, [suggestions, handleSuggestionClick]);

  // Memoizar a renderização de mensagens para evitar recriações desnecessárias
  const messageElements = useMemo(() => {
    return messages.map((message) => (
      <div 
        key={message.id} 
        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
      >
        <div 
          className={`max-w-[80%] rounded-lg p-4 ${message.role === "user" 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted"}`}
        >
          <div className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</div>
          
          {message.role === "assistant" && !message.feedback?.rating && (
            <div className="mt-3 flex items-center justify-end gap-2">
              <span className="text-sm text-muted-foreground mr-1">Esta resposta foi útil?</span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2 flex items-center gap-1"
                  onClick={() => handleFeedback(message, 5)}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>Sim</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 px-2 flex items-center gap-1"
                  onClick={() => handleFeedback(message, 1)}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>Não</span>
                </Button>
              </div>
            </div>
          )}
          
          {message.role === "assistant" && message.feedback?.rating && (
            <div className="mt-2 flex items-center justify-end">
              <span className="text-xs text-muted-foreground">
                {message.feedback.rating >= 3 ? "Obrigado pelo feedback positivo!" : "Obrigado pelo feedback."}
              </span>
            </div>
          )}
        </div>
      </div>
    ));
  }, [messages, handleFeedback]);

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              {suggestionButtons}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messageElements}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {isLoading && (
          <div className="flex justify-start max-w-4xl mx-auto">
            <div className="bg-muted rounded-lg p-4 max-w-[80%]">
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

      <div className="p-4 border-t bg-background">
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