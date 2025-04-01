import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

// Implementação simplificada sem uso de params
export async function DELETE(request: Request) {
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      console.error("Erro ao excluir treinamento: Firebase Admin não inicializado")
      return NextResponse.json(
        { error: "Serviço de banco de dados não está disponível no momento" },
        { status: 503 }
      )
    }

    // Extrair o ID da URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const id = pathSegments[pathSegments.length - 1]
    
    if (!id) {
      return NextResponse.json(
        { error: "ID do treinamento é obrigatório" },
        { status: 400 }
      );
    }

    // Excluir o treinamento diretamente usando adminDb
    const treinamentoRef = adminDb.collection("treinamentos").doc(id)
    await treinamentoRef.delete()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao excluir treinamento" },
      { status: 500 }
    )
  }
}

// Type-safe route configuration
export const config = {
  api: {
    bodyParser: false,
  },
}