import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    console.log("Recebendo requisição para feedback...");

    // Verificar autenticação
    const session = await getServerSession(authOptions);
    console.log("Sessão atual:", session);

    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("Dados recebidos:", body);

    const { messageId, rating, comment } = body;

    if (!messageId || rating === undefined) {
      return NextResponse.json(
        { error: "Dados de feedback incompletos" },
        { status: 400 }
      );
    }

    // Teste Firestore
    try {
      const feedbackData = {
        messageId,
        rating,
        comment: comment || "",
        userId: session.user?.id,
        userName: session.user?.name || "Usuário",
        userEmail: session.user?.email,
        timestamp: Timestamp.now(),
      };

      console.log("Salvando feedback no Firestore...");
      const docRef = await addDoc(collection(db, "chat_feedback"), feedbackData);
      console.log("Feedback salvo com sucesso! ID:", docRef.id);

      return NextResponse.json({ success: true, feedbackId: docRef.id });
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
