import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { adminDb } from "@/lib/firebase-admin-server";
import { Timestamp } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    console.log("Recebendo requisição para feedback...");

    // Verificar autenticação (opcional para o assistente IA)
    const session = await getServerSession(authOptions);
    console.log("Sessão atual:", session);

    // Permitir feedback mesmo sem autenticação para o assistente IA

    const body = await request.json();
    console.log("Dados recebidos:", body);

    const { messageId, rating, comment } = body;

    // Validação mais robusta dos dados recebidos
    if (!messageId) {
      console.log("messageId não fornecido");
      return NextResponse.json(
        { error: "ID da mensagem não fornecido" },
        { status: 400 }
      );
    }
    
    if (rating === undefined || rating === null) {
      console.log("rating não fornecido");
      return NextResponse.json(
        { error: "Avaliação não fornecida" },
        { status: 400 }
      );
    }

    // Salvar feedback no Firestore com informações para aprendizado da IA
    try {
      // Garantir que rating seja um número
      const ratingNumber = Number(rating);
      
      if (isNaN(ratingNumber)) {
        console.error("Rating não é um número válido:", rating);
        return NextResponse.json(
          { error: "Formato de avaliação inválido" },
          { status: 400 }
        );
      }
      
      // Extrair flags adicionais do corpo da requisição
      const isNegativeFeedback = body.isNegativeFeedback === true;
      const isDetailedFeedback = body.isDetailedFeedback === true;
      
      const feedbackData = {
        messageId,
        rating: ratingNumber,
        comment: comment || "",
        userId: session?.user?.id || "anonymous",
        userName: session?.user?.name || "Usuário Anônimo",
        userEmail: session?.user?.email || "anônimo",
        timestamp: Timestamp.now(),
        // Campos adicionais para aprendizado da IA
        isPositive: ratingNumber >= 3,
        learnPattern: ratingNumber >= 4, // Aprender com respostas muito bem avaliadas
        needsImprovement: ratingNumber < 3 || isNegativeFeedback, // Identificar padrões que precisam melhorar
        improvementSuggestion: comment || "",
        isNegativeFeedback: isNegativeFeedback,
        isDetailedFeedback: isDetailedFeedback,
        processed: false, // Flag para indicar se o feedback já foi processado para aprendizado
        processingAttempts: 0 // Contador de tentativas de processamento
      };

      console.log("Salvando feedback no Firestore...", feedbackData);
      
      // Verificar se o adminDb está inicializado
      if (!adminDb) {
        console.error("Firebase Admin não inicializado corretamente");
        return NextResponse.json(
          { error: "Erro interno do servidor" },
          { status: 500 }
        );
      }
      
      // Usar a API correta do Firebase Admin
      const docRef = await adminDb.collection("chat_feedback").add(feedbackData);
      console.log("Feedback salvo com sucesso! ID:", docRef.id);

      // Resposta com mensagem personalizada baseada no tipo de feedback
      const message = rating >= 3 
        ? "Obrigado pelo seu feedback positivo! Isso nos ajuda a melhorar o assistente."
        : "Agradecemos seu feedback. Vamos trabalhar para melhorar nossas respostas.";

      return NextResponse.json({ 
        success: true, 
        feedbackId: docRef.id,
        message
      })
    } catch (firestoreError) {
      console.error("Erro ao salvar no Firestore:", firestoreError);
      return NextResponse.json(
        { error: "Erro ao salvar no Firestore" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erro inesperado:", error);
    return NextResponse.json(
      { error: "Falha ao processar o feedback" },
      { status: 500 }
    );
  }
}
