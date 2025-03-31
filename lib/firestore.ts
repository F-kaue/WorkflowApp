import { db } from "@/lib/firebase"
import { adminDb } from "@/lib/firebase-admin"
import { collection, getDocs, doc, addDoc, deleteDoc, query, orderBy, Timestamp, DocumentData, QueryDocumentSnapshot } from "firebase/firestore"

export type Ticket = {
  id: string
  sindicato: string
  solicitacaoOriginal: string
  ticketGerado: string
  status: string
  dataCriacao: Timestamp
}

export async function listarTickets(): Promise<Ticket[]> {
  try {
    const ticketsRef = collection(db, "tickets")
    const snapshot = await getDocs(query(ticketsRef, orderBy("dataCriacao", "desc")))
    
    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
      id: doc.id,
      ...doc.data()
    })) as Ticket[]
  } catch (error) {
    console.error("Erro ao listar tickets:", error)
    throw error
  }
}

export async function excluirTicket(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "tickets", id))
  } catch (error) {
    console.error("Erro ao excluir ticket:", error)
    throw error
  }
}

export async function salvarTicket(ticket: Omit<Ticket, "id">): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "tickets"), {
      ...ticket,
      dataCriacao: Timestamp.now()
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao salvar ticket:", error)
    throw error
  }
}

// Tipos para treinamentos
export type Treinamento = {
  id?: string
  titulo: string
  descricao: string
  sindicato: string
  dataInicio: Timestamp
  dataFim: Timestamp
  status: string
  dataCriacao?: Timestamp
}

export async function listarTreinamentos(): Promise<Treinamento[]> {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Serviço de banco de dados não está disponível")
      return []
    }
    
    const treinamentosRef = adminDb.collection("treinamentos")
    const snapshot = await treinamentosRef.orderBy("dataCriacao", "desc").get()
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Treinamento[]
  } catch (error) {
    console.error("Erro ao listar treinamentos:", error)
    throw error
  }
}

export async function criarTreinamento(treinamento: Omit<Treinamento, "id">): Promise<string> {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Serviço de banco de dados não está disponível")
      throw new Error("Serviço de banco de dados não está disponível no momento")
    }
    
    const docRef = await adminDb.collection("treinamentos").add({
      ...treinamento,
      dataCriacao: new Date()
    })
    return docRef.id
  } catch (error) {
    console.error("Erro ao criar treinamento:", error)
    throw error
  }
}

export async function excluirTreinamento(id: string): Promise<void> {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Serviço de banco de dados não está disponível")
      throw new Error("Serviço de banco de dados não está disponível no momento")
    }
    
    await adminDb.collection("treinamentos").doc(id).delete()
  } catch (error) {
    console.error("Erro ao excluir treinamento:", error)
    throw error
  }
}