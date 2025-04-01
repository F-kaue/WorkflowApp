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

    if (!messageId || rating === undefined) {
      return NextResponse.json(
        { error: "Dados de feedback incompletos" },
        { status: 400 }
      );
    }

    // Salvar feedback no Firestore com informações para aprendizado da IA
    try {
      const feedbackData = {
        messageId,
        rating,
        comment: comment || "",
        userId: session?.user?.id || "anonymous",
        userName: session?.user?.name || "Usuário Anônimo",
        userEmail: session?.user?.email || "anônimo",
        timestamp: Timestamp.now(),
        // Campos adicionais para aprendizado da IA
        isPositive: rating >= 3,
        learnPattern: rating >= 4, // Aprender com respostas muito bem avaliadas
        needsImprovement: rating < 3, // Identificar padrões que precisam melhorar
        improvementSuggestion: comment || ""
      };

      console.log("Salvando feedback no Firestore...");
      
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
