"use client"

import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Copy, Video } from "lucide-react"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

export default function SucessoPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  
  const titulo = searchParams.get("titulo")
  const meetLink = searchParams.get("meetLink")

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(meetLink || "")
      setCopied(true)
      toast({
        title: "Link copiado!",
        description: "O link da reunião foi copiado para sua área de transferência.",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link. Tente copiar manualmente.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl mb-2">Treinamento Criado com Sucesso!</CardTitle>
          <CardDescription className="text-lg">
            {titulo}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {meetLink && (
            <div className="bg-secondary p-6 rounded-lg space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Video className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-medium">Link da Reunião</h3>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <code className="bg-background px-4 py-2 rounded">{meetLink}</code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className={copied ? "text-green-500" : ""}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Este link foi enviado para todos os participantes por email
              </p>
            </div>
          )}

          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => router.push("/treinamentos/novo")}
            >
              Criar Outro Treinamento
            </Button>
            <Button
              onClick={() => router.push("/treinamentos")}
            >
              Ver Todos os Treinamentos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}