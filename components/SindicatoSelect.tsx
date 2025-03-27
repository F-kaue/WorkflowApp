"use client"

import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Sindicato {
  id: string
  nome: string
}

interface SindicatoSelectProps {
  value: string
  onChange: (value: string) => void
}

export function SindicatoSelect({ value, onChange }: SindicatoSelectProps) {
  const { toast } = useToast()
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([])
  const [novoSindicato, setNovoSindicato] = useState("")
  const [loading, setLoading] = useState(true)
  const [adicionando, setAdicionando] = useState(false)

  const carregarSindicatos = async () => {
    try {
      setLoading(true)
      console.log("Iniciando carregamento de sindicatos...")
      
      const response = await fetch("/api/sindicatos")
      console.log("Resposta recebida:", response.status, response.statusText)
      
      const data = await response.json()
      console.log("Dados recebidos:", data)

      if (!response.ok) {
        throw new Error(data?.error || `Erro ao buscar sindicatos: ${response.status}`)
      }

      if (!data || typeof data !== 'object') {
        throw new Error("Resposta inválida do servidor")
      }

      if (!Array.isArray(data.sindicatos)) {
        console.error("Dados recebidos:", data)
        throw new Error("Formato de resposta inválido: sindicatos não é um array")
      }

      setSindicatos(data.sindicatos)
      console.log("Sindicatos carregados com sucesso:", data.sindicatos)
    } catch (error) {
      console.error("Erro detalhado ao carregar sindicatos:", error)
      toast({
        title: "Erro ao carregar sindicatos",
        description: error instanceof Error ? error.message : "Erro desconhecido ao carregar sindicatos",
        variant: "destructive",
      })
      setSindicatos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarSindicatos()
  }, [])

  const adicionarSindicato = async () => {
    if (!novoSindicato.trim()) return

    try {
      setAdicionando(true)
      console.log("Iniciando adição de sindicato:", novoSindicato)

      const response = await fetch("/api/sindicatos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome: novoSindicato.trim() }),
      })

      const data = await response.json()
      console.log("Resposta da adição:", data)

      if (!response.ok) {
        throw new Error(data?.error || `Erro ao adicionar sindicato: ${response.status}`)
      }

      if (!data || typeof data !== 'object') {
        throw new Error("Resposta inválida do servidor")
      }

      if (!Array.isArray(data.sindicatos)) {
        console.error("Dados recebidos:", data)
        throw new Error("Formato de resposta inválido: sindicatos não é um array")
      }

      setSindicatos(data.sindicatos)
      
      if (!data.sindicatoId) {
        throw new Error("ID do novo sindicato não retornado pelo servidor")
      }
      
      onChange(data.sindicatoId)
      setNovoSindicato("")
      
      toast({
        title: "Sucesso",
        description: "Sindicato adicionado com sucesso",
      })
      
      console.log("Sindicato adicionado com sucesso:", data.sindicatoId)
    } catch (error) {
      console.error("Erro detalhado ao adicionar sindicato:", error)
      toast({
        title: "Erro ao adicionar sindicato",
        description: error instanceof Error ? error.message : "Erro desconhecido ao adicionar sindicato",
        variant: "destructive",
      })
    } finally {
      setAdicionando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span>Carregando sindicatos...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um sindicato" />
        </SelectTrigger>
        <SelectContent>
          {sindicatos.map((sindicato) => (
            <SelectItem key={sindicato.id} value={sindicato.id}>
              {sindicato.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Input
          placeholder="Digite o nome do novo sindicato"
          value={novoSindicato}
          onChange={(e) => setNovoSindicato(e.target.value)}
          disabled={adicionando}
        />
        <Button
          type="button"
          variant="outline"
          onClick={adicionarSindicato}
          disabled={!novoSindicato.trim() || adicionando}
        >
          {adicionando ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
} 