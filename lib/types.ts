import { Timestamp } from "firebase/firestore"

export type Ticket = {
  id?: string
  cliente: string
  solicitacaoOriginal: string
  projeto: {
    titulo: string
    descricao: string
    responsavel_principal: string
    prioridade: string
    status: string
    complexidade: string
    impacto: string
  }
  tarefas: Array<{
    titulo: string
    descricao: {
      contexto: string
      objetivo: string
      requisitos: string[]
      sugestao_implementacao: string[]
      impacto: string[]
      observacoes: string[]
    }
    responsavel: string
    prioridade: string
    status: string
    estimativa_horas: number
    dependencias: string[]
  }>
  dataCriacao: Timestamp
}

export type Treinamento = {
  id?: string
  tipo: string
  titulo: string
  descricao: string
  sindicato: string
  dataInicio: Timestamp
  dataFim: Timestamp
  status: string
  participantes: string[]
  dataCriacao?: Timestamp
  criadoPor?: string
}

export type Participante = {
  email: string
  nome?: string
  dataCriacao?: Timestamp
}

export type TipoTreinamento = {
  tipo: string
  dataCriacao?: Timestamp
}

export type Sindicato = {
  nome: string
  dataCriacao?: Timestamp
}