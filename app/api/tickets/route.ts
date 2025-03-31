import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }
    const ticketsRef = adminDb.collection("tickets")
    const snapshot = await ticketsRef.orderBy("dataCriacao", "desc").get()
    
    const tickets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dataCriacao: doc.data().dataCriacao?.toDate?.()?.toISOString() || null,
      dataAtualizacao: doc.data().dataAtualizacao?.toDate?.()?.toISOString() || null
    }))

    return NextResponse.json(tickets)
  } catch (error) {
    console.error("Erro ao listar tickets:", error)
    return NextResponse.json(
      { error: "Erro ao listar tickets" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }
    
    const data = await request.json()
    const ticketRef = adminDb.collection("tickets").doc()
    
    await ticketRef.set({
      ...data,
      dataCriacao: new Date(),
      dataAtualizacao: new Date()
    })

    return NextResponse.json({ id: ticketRef.id })
  } catch (error) {
    console.error("Erro ao criar ticket:", error)
    return NextResponse.json(
      { error: "Erro ao criar ticket" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }
    
    const { id } = await request.json()
    
    if (!id) {
      throw new Error("ID do ticket não fornecido")
    }

    const ticketRef = adminDb.collection("tickets").doc(id)
    await ticketRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir ticket:", error)
    return NextResponse.json(
      { error: "Erro ao excluir ticket" },
      { status: 500 }
    )
  }
}