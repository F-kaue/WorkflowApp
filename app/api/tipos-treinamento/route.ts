import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// GET - Listar todos os tipos de treinamento
export async function GET() {
  try {
    const snapshot = await adminDb.collection("tipos-treinamento").get()
    const tipos = snapshot.docs.map(doc => doc.data().tipo)
    return NextResponse.json(tipos)
  } catch (error) {
    console.error("Erro ao listar tipos de treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao listar tipos de treinamento" },
      { status: 500 }
    )
  }
}

// POST - Adicionar um novo tipo de treinamento
export async function POST(request: Request) {
  try {
    const { tipo } = await request.json()
    
    // Verifica se já existe
    const snapshot = await adminDb
      .collection("tipos-treinamento")
      .where("tipo", "==", tipo)
      .get()
    
    if (snapshot.empty) {
      await adminDb.collection("tipos-treinamento").add({
        tipo,
        dataCriacao: new Date()
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao criar tipo de treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao criar tipo de treinamento" },
      { status: 500 }
    )
  }
}

// DELETE - Excluir um tipo de treinamento
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo')

    if (!tipo) {
      return NextResponse.json(
        { error: "Tipo de treinamento é obrigatório" },
        { status: 400 }
      )
    }

    const tiposRef = adminDb.collection("config").doc("tiposTreinamento")
    const tiposDoc = await tiposRef.get()
    const tipos = tiposDoc.exists ? tiposDoc.data()?.lista || [] : []

    // Verificar se o tipo existe
    if (!tipos.includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo de treinamento não encontrado" },
        { status: 404 }
      )
    }

    // Remover o tipo
    const novosTipos = tipos.filter(t => t !== tipo)
    await tiposRef.set({ lista: novosTipos })

    return NextResponse.json({ 
      message: "Tipo de treinamento removido com sucesso",
      tipos: novosTipos
    })
  } catch (error) {
    console.error("Erro ao excluir tipo de treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao excluir tipo de treinamento", details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}