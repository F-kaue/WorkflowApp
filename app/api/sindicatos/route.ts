import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// GET - Listar todos os sindicatos
export async function GET() {
  try {
    const snapshot = await adminDb.collection("sindicatos").get()
    const sindicatos = snapshot.docs.map(doc => doc.data().nome)
    return NextResponse.json(sindicatos)
  } catch (error) {
    console.error("Erro ao listar sindicatos:", error)
    return NextResponse.json(
      { error: "Erro ao listar sindicatos" },
      { status: 500 }
    )
  }
}

// POST - Adicionar novo sindicato
export async function POST(request: Request) {
  try {
    const { nome } = await request.json()
    
    // Verifica se já existe
    const snapshot = await adminDb
      .collection("sindicatos")
      .where("nome", "==", nome)
      .get()
    
    if (snapshot.empty) {
      await adminDb.collection("sindicatos").add({
        nome,
        dataCriacao: new Date()
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao criar sindicato:", error)
    return NextResponse.json(
      { error: "Erro ao criar sindicato" },
      { status: 500 }
    )
  }
}

// DELETE - Excluir um sindicato
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: "ID do sindicato é obrigatório" },
        { status: 400 }
      )
    }

    const sindicatoRef = adminDb.collection("sindicatos").doc(id)
    const doc = await sindicatoRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Sindicato não encontrado" },
        { status: 404 }
      )
    }

    await sindicatoRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro detalhado ao excluir sindicato:", error)
    return NextResponse.json(
      { error: "Erro ao excluir sindicato", details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
