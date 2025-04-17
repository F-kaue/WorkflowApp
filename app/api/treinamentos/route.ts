import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

export async function GET() {
  try {
    console.log("Iniciando busca de treinamentos na API...")
    
    if (!adminDb) {
      console.error("Firebase Admin não inicializado")
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }

    const treinamentosRef = adminDb.collection("treinamentos")
    const snapshot = await treinamentosRef.orderBy("dataCriacao", "desc").get()
    
    const treinamentos = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        titulo: data.titulo || "",
        descricao: data.descricao || "",
        sindicato: data.sindicato || "",
        tipo: data.tipo || "",
        status: data.status || "Agendado",
        participantes: Array.isArray(data.participantes) ? data.participantes : [],
        dataInicio: data.dataInicio?.toDate?.()?.getTime() || null,
        dataFim: data.dataFim?.toDate?.()?.getTime() || null,
        dataCriacao: data.dataCriacao?.toDate?.()?.getTime() || null
      }
    })

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
    if (!adminDb) {
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível" },
        { status: 503 }
      )
    }
    
    const data = await request.json()
    const treinamentoRef = adminDb.collection("treinamentos").doc()
    
    await treinamentoRef.set({
      ...data,
      dataInicio: data.dataInicio ? Timestamp.fromDate(new Date(data.dataInicio)) : null,
      dataFim: data.dataFim ? Timestamp.fromDate(new Date(data.dataFim)) : null,
      dataCriacao: Timestamp.now()
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