import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { adminDb, assertIsServer } from "@/lib/firebase-admin-server"
import { QueryDocumentSnapshot } from "firebase-admin/firestore"

// Garantir que este código só execute no servidor
assertIsServer()

// Tipo para as informações de treinamento da IA
type TrainingData = {
  content: string
  timestamp: any
  userId?: string
  userName?: string
  userEmail?: string
}

// Função para salvar informações de treinamento no Firestore
export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    console.log("Sessão do usuário:", session)
    
    if (!session) {
      console.log("Erro: Usuário não autenticado")
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verificar se o usuário tem ID
    if (!session.user?.id) {
      console.log("Erro: ID do usuário não encontrado na sessão")
      return NextResponse.json(
        { error: "Informações do usuário incompletas" },
        { status: 400 }
      )
    }

    // Extrair conteúdo da requisição
    let content
    try {
      const body = await request.json()
      content = body.content
      console.log("Conteúdo recebido:", content ? "Conteúdo válido" : "Conteúdo vazio")
    } catch (parseError) {
      console.error("Erro ao processar o corpo da requisição:", parseError)
      return NextResponse.json(
        { error: "Formato de requisição inválido" },
        { status: 400 }
      )
    }

    if (!content) {
      console.log("Erro: Conteúdo não fornecido")
      return NextResponse.json(
        { error: "Conteúdo não fornecido" },
        { status: 400 }
      )
    }

    // Salvar a informação de treinamento no Firestore
    const trainingData: TrainingData = {
      content,
      timestamp: new Date(),
      userId: session.user.id,
      userName: session.user?.name || "Administrador",
      userEmail: session.user?.email
    }

    console.log("Tentando salvar no Firestore:", {
      collection: "ai_training",
      userId: trainingData.userId,
      contentLength: trainingData.content.length
    })

    try {
      const docRef = await adminDb.collection("ai_training").add(trainingData)
      console.log("Documento salvo com sucesso, ID:", docRef.id)
      
      return NextResponse.json({ 
        success: true, 
        trainingId: docRef.id 
      })
    } catch (firestoreError) {
      console.error("Erro específico do Firestore:", firestoreError)
      throw firestoreError
    }
  } catch (error) {
    console.error("Erro ao salvar informação de treinamento:", error)
    return NextResponse.json(
      { error: "Falha ao salvar informação de treinamento" },
      { status: 500 }
    )
  }
}

// Função para obter informações de treinamento
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }
    
    // Consultar informações de treinamento
    const querySnapshot = await adminDb.collection("ai_training")
      .orderBy("timestamp", "desc")
      .get()
    
    const trainingData = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }))
    
    return NextResponse.json({ trainingData })
  } catch (error) {
    console.error("Erro ao obter informações de treinamento:", error)
    return NextResponse.json(
      { error: "Falha ao obter informações de treinamento" },
      { status: 500 }
    )
  }
}

// Função para excluir uma informação de treinamento
export async function DELETE(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "ID não fornecido" },
        { status: 400 }
      )
    }

    // Excluir a informação de treinamento
    await adminDb.collection("ai_training").doc(id).delete()

    return NextResponse.json({ 
      success: true
    })
  } catch (error) {
    console.error("Erro ao excluir informação de treinamento:", error)
    return NextResponse.json(
      { error: "Falha ao excluir informação de treinamento" },
      { status: 500 }
    )
  }
}
