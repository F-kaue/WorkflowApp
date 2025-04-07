"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Copy, Save, ArrowLeft, Eye } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function NovoTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [ticketGerado, setTicketGerado] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    sindicato: "",
    solicitacaoOriginal: ""
  })

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault()
    setPreviewLoading(true)

    try {
      // Gera o ticket usando a IA
      const generateResponse = await fetch("/api/generate-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      // Obter o texto da resposta primeiro para evitar erros de stream já lido
      const responseText = await generateResponse.text()
      
      // Verificar se a resposta foi bem-sucedida
      if (!generateResponse.ok) {
        console.error("Erro na resposta da API:", generateResponse.status, responseText.substring(0, 100))
        throw new Error(`Erro ${generateResponse.status}: ${responseText || "Erro desconhecido"}`)
      }
      
      // Tentar converter para JSON se possível
      let responseData: any = null
      try {
        responseData = JSON.parse(responseText)
        console.log("Resposta JSON processada com sucesso")
      } catch (jsonError) {
        console.log("Resposta não é um JSON válido, usando como texto")
        // Se não for JSON válido, usar o texto diretamente como resposta
        responseData = responseText
      }
      
      // Verificar se a resposta está vazia
      if (!responseData) {
        throw new Error("Resposta vazia do servidor")
      }
      
      // Extrair o ticket da resposta
      let generatedTicket = null
      
      // Caso 1: Se a resposta for uma string direta, use-a como ticket
      if (typeof responseData === 'string' && responseData.trim().length > 0) {
        generatedTicket = responseData
        console.log("Usando resposta direta como ticket")
      }
      // Caso 2: Se a resposta for um objeto, procurar o ticket em várias propriedades possíveis
      else if (typeof responseData === 'object' && responseData !== null) {
        // Verificar todas as possíveis propriedades onde o ticket pode estar
        if (responseData.ticket && typeof responseData.ticket === 'string') {
          generatedTicket = responseData.ticket
          console.log("Ticket encontrado na propriedade 'ticket'")
        } else if (responseData.ticketGerado && typeof responseData.ticketGerado === 'string') {
          generatedTicket = responseData.ticketGerado
          console.log("Ticket encontrado na propriedade 'ticketGerado'")
        } else if (responseData.content && typeof responseData.content === 'string') {
          generatedTicket = responseData.content
          console.log("Ticket encontrado na propriedade 'content'")
        } else if (responseData.success === true && responseData.data && typeof responseData.data === 'object') {
          // Verificar se o ticket está em um objeto data aninhado
          if (responseData.data.ticket && typeof responseData.data.ticket === 'string') {
            generatedTicket = responseData.data.ticket
            console.log("Ticket encontrado na propriedade 'data.ticket'")
          } else if (responseData.data.ticketGerado && typeof responseData.data.ticketGerado === 'string') {
            generatedTicket = responseData.data.ticketGerado
            console.log("Ticket encontrado na propriedade 'data.ticketGerado'")
          } else if (responseData.data.content && typeof responseData.data.content === 'string') {
            generatedTicket = responseData.data.content
            console.log("Ticket encontrado na propriedade 'data.content'")
          }
        }
        
        // Última tentativa: verificar se há alguma propriedade que contenha uma string longa
        if (!generatedTicket) {
          for (const key in responseData) {
            if (typeof responseData[key] === 'string' && responseData[key].length > 100) {
              generatedTicket = responseData[key]
              console.log(`Encontrado possível ticket na propriedade '${key}'`)
              break
            }
          }
        }
      }
      
      if (!generatedTicket) {
        console.error("Resposta sem ticket:", typeof responseData === 'object' ? JSON.stringify(responseData).substring(0, 100) : responseData.substring(0, 100))
        throw new Error("Resposta da API não contém o ticket gerado")
      }
      
      setTicketGerado(generatedTicket)
      setActiveTab("preview")
      
      toast({
        title: "Sucesso",
        description: "Ticket gerado com sucesso! Verifique a pré-visualização.",
      })
    } catch (error: unknown) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao gerar o ticket. Por favor, tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSave = async () => {
    if (!ticketGerado) return
    
    setLoading(true)

    try {
      // Salva o ticket no banco
      const saveResponse = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          ticketGerado,
          status: "Novo"
        }),
      })

      if (!saveResponse.ok) {
        throw new Error("Erro ao salvar ticket")
      }

      toast({
        title: "Sucesso",
        description: "Ticket salvo com sucesso!",
      })

      router.push("/tickets")
      router.refresh()
    } catch (error: unknown) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao salvar o ticket. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Texto copiado para a área de transferência",
    })
  }

  const extractSections = (markdown: string) => {
    if (!markdown) return {}

    const sections: Record<string, string> = {}
    let currentSection = ''
    let currentContent = ''

    const lines = markdown.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Se encontramos uma nova seção, salvamos a anterior
        if (currentSection && currentContent) {
          sections[currentSection] = currentContent.trim()
        }
        currentSection = line.replace('## ', '').trim()
        currentContent = ''
      } else if (currentSection) {
        currentContent += line + '\n'
      }
    }

    // Adiciona a última seção
    if (currentSection && currentContent) {
      sections[currentSection] = currentContent.trim()
    }

    return sections
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Novo Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Formulário</TabsTrigger>
              <TabsTrigger value="preview" disabled={!ticketGerado}>Pré-visualização</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-4 pt-4">
              <form onSubmit={handlePreview} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sindicato">Nome do Sindicato</Label>
                  <Input
                    id="sindicato"
                    value={formData.sindicato}
                    onChange={(e) =>
                      setFormData({ ...formData, sindicato: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solicitacao">Solicitação</Label>
                  <Textarea
                    id="solicitacao"
                    value={formData.solicitacaoOriginal}
                    onChange={(e) =>
                      setFormData({ ...formData, solicitacaoOriginal: e.target.value })
                    }
                    className="min-h-[200px]"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={previewLoading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                  <Button type="submit" disabled={previewLoading}>
                    {previewLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Eye className="mr-2 h-4 w-4" />
                    Pré-visualizar
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-6 pt-4">
              {ticketGerado && (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Pré-visualização do Ticket</h3>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => copyToClipboard(ticketGerado)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Tudo
                    </Button>
                  </div>
                  
                  <div className="prose prose-sm max-w-none dark:prose-invert border rounded-md p-4 bg-muted/30">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {ticketGerado}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Copiar Seções</h3>
                    <div className="grid gap-2">
                      {Object.entries(extractSections(ticketGerado)).map(([title, content]) => (
                        <div key={title} className="flex justify-between items-center border rounded-md p-3">
                          <span className="font-medium">{title}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("form")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Voltar ao Formulário
                    </Button>
                    <Button 
                      onClick={handleSave} 
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Ticket
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
