"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock, X } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

type Participante = {
  email: string
  nome?: string
  frequencia?: number
}

export default function NovoTreinamentoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [tiposTreinamento, setTiposTreinamento] = useState<string[]>([])
  const [sindicatos, setSindicatos] = useState<string[]>([])
  const [participantesSalvos, setParticipantesSalvos] = useState<Participante[]>([])
  const [tipoTreinamento, setTipoTreinamento] = useState("")
  const [sindicato, setSindicato] = useState("")
  const [titulo, setTitulo] = useState("")
  const [descricao, setDescricao] = useState("")
  const [dataInicio, setDataInicio] = useState("")
  const [horaInicio, setHoraInicio] = useState("09:00")
  const [horaFim, setHoraFim] = useState("10:00")
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [novoParticipante, setNovoParticipante] = useState("")
  const [tipoInputOpen, setTipoInputOpen] = useState(false)
  const [sindicatoInputOpen, setSindicatoInputOpen] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<typeof participantesSalvos>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  useEffect(() => {
    if (tipoTreinamento && sindicato) {
      setTitulo(`Treinamento ${tipoTreinamento} - ${sindicato}`)
      setDescricao(gerarDescricaoAutomatica())
    }
  }, [tipoTreinamento, sindicato])

  useEffect(() => {
    const carregarParticipantes = async () => {
      try {
        const res = await fetch("/api/participantes")
        if (res.ok) {
          const data = await res.json()
          setParticipantesSalvos(data.participantes || [])
        }
      } catch (error) {
        console.error("Erro ao carregar participantes:", error)
      }
    }

    carregarParticipantes()
  }, [])

  useEffect(() => {
    if (novoParticipante) {
      const filtered = participantesSalvos
        .filter(p => 
          p.email.toLowerCase().includes(novoParticipante.toLowerCase()) &&
          !participantes.some(part => part.email === p.email)
        )
        .sort((a, b) => (b.frequencia || 0) - (a.frequencia || 0))
        .slice(0, 5) // Mostrar apenas as 5 sugestões mais relevantes
      setFilteredSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }, [novoParticipante, participantes, participantesSalvos])

  const carregarDados = async () => {
    try {
      const [tiposRes, sindicatosRes] = await Promise.all([
        fetch("/api/tipos-treinamento"),
        fetch("/api/sindicatos"),
      ])

      if (!tiposRes.ok || !sindicatosRes.ok) {
        throw new Error("Erro ao carregar dados")
      }

      const tipos = await tiposRes.json()
      const sinds = await sindicatosRes.json()

      setTiposTreinamento(tipos)
      setSindicatos(sinds)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const gerarDescricaoAutomatica = () => {
    const participantesLista = participantes.map(p => p.email).join("\n- ")
    let descricao = `Treinamento do ${tipoTreinamento} ao ${sindicato} para apresentar todas as funcionalidades do sistema SindSystem.`

    if (dataInicio) {
      descricao += `\n\nDetalhes do Treinamento:
- Data: ${format(new Date(dataInicio), "dd/MM/yyyy", { locale: ptBR })}
- Horário: ${horaInicio} às ${horaFim}
- Tipo: ${tipoTreinamento}
- Sindicato: ${sindicato}`
    }

    if (participantes.length > 0) {
      descricao += `\n\nParticipantes:\n- ${participantesLista}`
    }

    descricao += "\n\nDurante o treinamento, serão abordados os principais aspectos e recursos disponíveis para otimizar o uso da plataforma."

    return descricao
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataInicioCompleta = `${dataInicio}T${horaInicio}:00`
      const dataFimCompleta = `${dataInicio}T${horaFim}:00`

      const treinamentoRes = await fetch("/api/treinamentos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo: tipoTreinamento,
          titulo,
          descricao: gerarDescricaoAutomatica(),
          sindicato,
          dataInicio: new Date(dataInicioCompleta),
          dataFim: new Date(dataFimCompleta),
          status: "Agendado",
          participantes: participantes.map(p => p.email),
          criadoPor: session?.user?.email
        }),
      })

      if (!treinamentoRes.ok) {
        throw new Error("Erro ao criar treinamento")
      }

      const eventRes = await fetch("/api/calendar/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: titulo,
          description: gerarDescricaoAutomatica(),
          start: dataInicioCompleta,
          end: dataFimCompleta,
          attendees: participantes.map(p => p.email),
          sendUpdates: "all"
        }),
      })

      if (!eventRes.ok) {
        const error = await eventRes.json()
        throw new Error(error.details || "Erro ao criar evento no calendário")
      }

      const eventData = await eventRes.json()

      if (!tiposTreinamento.includes(tipoTreinamento)) {
        await fetch("/api/tipos-treinamento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tipo: tipoTreinamento })
        })
      }

      if (!sindicatos.includes(sindicato)) {
        await fetch("/api/sindicatos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: sindicato })
        })
      }

      const novosParticipantes = participantes.filter(
        p => !participantesSalvos.some(saved => saved.email === p.email)
      )

      if (novosParticipantes.length > 0) {
        const participantesRes = await fetch("/api/participantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantes: novosParticipantes })
        })

        if (participantesRes.ok) {
          await participantesRes.json()
          setParticipantesSalvos(prev => [...prev, ...novosParticipantes])
        }
      }

      toast({
        title: "Sucesso",
        description: "Treinamento criado e convites enviados!",
      })

      router.push(`/treinamentos/sucesso?titulo=${encodeURIComponent(titulo)}&meetLink=${encodeURIComponent(eventData.meetLink)}`)
    } catch (error: any) {
      console.error("Erro:", error)
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao criar o treinamento. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddParticipante = () => {
    if (novoParticipante && !participantes.some(p => p.email === novoParticipante)) {
      setParticipantes([...participantes, { email: novoParticipante }])
      setNovoParticipante("")
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Novo Treinamento</h1>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Treinamento</Label>
              <Popover open={tipoInputOpen} onOpenChange={setTipoInputOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={tipoInputOpen}
                    className="w-full justify-between"
                  >
                    {tipoTreinamento || "Selecione ou digite o tipo"}
                    <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar tipo..."
                      value={tipoTreinamento}
                      onValueChange={setTipoTreinamento}
                    />
                    <CommandList>
                      <CommandEmpty>Digite para adicionar novo tipo</CommandEmpty>
                      <CommandGroup>
                        {tiposTreinamento.map((tipo) => (
                          <CommandItem
                            key={tipo}
                            value={tipo}
                            onSelect={(value) => {
                              setTipoTreinamento(value)
                              setTipoInputOpen(false)
                            }}
                          >
                            {tipo}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Sindicato</Label>
              <Popover open={sindicatoInputOpen} onOpenChange={setSindicatoInputOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={sindicatoInputOpen}
                    className="w-full justify-between"
                  >
                    {sindicato || "Selecione ou digite o sindicato"}
                    <CalendarIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar sindicato..."
                      value={sindicato}
                      onValueChange={setSindicato}
                    />
                    <CommandList>
                      <CommandEmpty>Digite para adicionar novo sindicato</CommandEmpty>
                      <CommandGroup>
                        {sindicatos.map((sind) => (
                          <CommandItem
                            key={sind}
                            value={sind}
                            onSelect={(value) => {
                              setSindicato(value)
                              setSindicatoInputOpen(false)
                            }}
                          >
                            {sind}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Hora Início</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  <Input
                    type="time"
                    value={horaFim}
                    onChange={(e) => setHoraFim(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={novoParticipante}
                    onChange={(e) => setNovoParticipante(e.target.value)}
                    placeholder="Digite o email do participante"
                    type="email"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddParticipante()
                      }
                    }}
                  />
                  {showSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
                      {filteredSuggestions.map((p) => (
                        <button
                          key={p.email}
                          type="button"
                          className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between"
                          onClick={() => {
                            setParticipantes([...participantes, { email: p.email }])
                            setNovoParticipante("")
                            setShowSuggestions(false)
                          }}
                        >
                          <span>{p.email}</span>
                          {p.frequencia !== undefined && p.frequencia > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {p.frequencia} treinamento{p.frequencia > 1 ? 's' : ''}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  type="button"
                  onClick={handleAddParticipante}
                  variant="secondary"
                >
                  Adicionar
                </Button>
              </div>

              {participantes.length > 0 && (
                <div className="mt-2 space-y-2">
                  <Label>Participantes Adicionados</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {participantes.map((p, index) => (
                      <div key={p.email} className="flex items-center justify-between bg-secondary p-2 rounded">
                        <span>{p.email}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setParticipantes(participantes.filter((_, i) => i !== index))
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Treinamento"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
