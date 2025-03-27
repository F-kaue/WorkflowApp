"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2 } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: any
  userId?: string
  userName?: string
  userEmail?: string
}

export default function ChatHistoryPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChatHistory()
  }, [])

  const fetchChatHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/ai/chat-history")
      if (!response.ok) {
        throw new Error("Erro ao carregar histórico de chat")
      }
      const data = await response.json()
      setMessages(data.messages)
    } catch (error) {
      console.error("Erro ao carregar histórico de chat:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return ""
    try {
      const date = new Date(timestamp.seconds * 1000)
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (error) {
      console.error("Erro ao formatar data:", error)
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

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Histórico de Conversas</h1>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todas as Mensagens</TabsTrigger>
          <TabsTrigger value="user">Perguntas dos Usuários</TabsTrigger>
          <TabsTrigger value="assistant">Respostas do Assistente</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {message.role === "user" ? "Usuário" : "Assistente"}: {message.userName || "Anônimo"}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(message.timestamp)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </CardContent>
              </Card>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma mensagem encontrada.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="user">
          <div className="space-y-4">
            {messages
              .filter((message) => message.role === "user")
              .map((message) => (
                <Card key={message.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Usuário: {message.userName || "Anônimo"}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(message.timestamp)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </CardContent>
                </Card>
              ))}

            {messages.filter((message) => message.role === "user").length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma pergunta de usuário encontrada.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assistant">
          <div className="space-y-4">
            {messages
              .filter((message) => message.role === "assistant")
              .map((message) => (
                <Card key={message.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Assistente</CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(message.timestamp)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </CardContent>
                </Card>
              ))}

            {messages.filter((message) => message.role === "assistant").length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma resposta do assistente encontrada.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}