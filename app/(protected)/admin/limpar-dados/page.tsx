"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LimparDadosPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [resultado, setResultado] = useState<{ success: boolean; message: string } | null>(null)

  const limparDados = async () => {
    try {
      setIsLoading(true)
      setResultado(null)

      const response = await fetch("/api/limpar-dados", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Falha ao limpar dados")
      }

      const data = await response.json()
      setResultado({
        success: true,
        message: "Dados limpos com sucesso!",
      })

      toast({
        title: "Sucesso",
        description: "Todos os dados foram limpos com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao limpar dados:", error)
      setResultado({
        success: false,
        message: error instanceof Error ? error.message : "Erro desconhecido ao limpar dados",
      })

      toast({
        title: "Erro",
        description: "Falha ao limpar os dados. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle>Limpar Dados do Sistema</CardTitle>
          <CardDescription>
            Esta ação irá limpar todos os dados de sindicatos, treinamentos e tickets do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Atenção: Esta ação não pode ser desfeita. Todos os dados serão permanentemente removidos.
          </p>

          {resultado && (
            <Alert variant={resultado.success ? "default" : "destructive"} className="mb-4">
              {resultado.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle>{resultado.success ? "Sucesso" : "Erro"}</AlertTitle>
              <AlertDescription>{resultado.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={limparDados} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpando dados...
              </>
            ) : (
              "Limpar Todos os Dados"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

