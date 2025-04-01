import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Erro ao carregar treinamentos: Firebase Admin não inicializado")
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }

    const treinamentosRef = adminDb.collection("treinamentos")
    const snapshot = await treinamentosRef.orderBy("dataCriacao", "desc").get()
    
    const treinamentos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dataInicio: doc.data().dataInicio?.toDate?.()?.toISOString() || null,
      dataFim: doc.data().dataFim?.toDate?.()?.toISOString() || null,
      dataCriacao: doc.data().dataCriacao?.toDate?.()?.toISOString() || null
    }))

    return NextResponse.json(treinamentos)
  } catch (error) {
    console.error("Erro ao listar treinamentos:", error)
    return NextResponse.json(
      { error: "Erro ao listar treinamentos" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Erro ao criar treinamento: Firebase Admin não inicializado")
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }
    
    const data = await request.json()
    const treinamentoRef = adminDb.collection("treinamentos").doc()
    
    await treinamentoRef.set({
      ...data,
      dataCriacao: new Date()
    })

    return NextResponse.json({ id: treinamentoRef.id })
  } catch (error) {
    console.error("Erro ao criar treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao criar treinamento" },
      { status: 500 }
    )
  }
}