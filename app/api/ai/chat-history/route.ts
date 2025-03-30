import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { adminDb, assertIsServer } from "@/lib/firebase-admin-server";
import admin from "firebase-admin";
import { QueryDocumentSnapshot } from "firebase-admin/firestore";

// Garantir que este código só execute no servidor
assertIsServer();

// Tipo para as mensagens do chat
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: admin.firestore.Timestamp;
  userId?: string;
  userName?: string;
  userEmail?: string;
};

// Função para salvar mensagem no Firestore
export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { message, role } = await request.json();

    if (!message || !role) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Salvar a mensagem no Firestore usando adminDb
    const chatMessage: ChatMessage = {
      role,
      content: message,
      timestamp: admin.firestore.Timestamp.now(),
      userId: session.user?.id,
      userName: session.user?.name || "Usuário",
      userEmail: session.user?.email,
    };

    const docRef = await adminDb.collection("chat_history").add(chatMessage);

    return NextResponse.json({ success: true, messageId: docRef.id });
  } catch (error) {
    console.error("Erro ao salvar mensagem do chat:", error);
    return NextResponse.json(
      { error: "Falha ao salvar mensagem do chat" },
      { status: 500 }
    );
  }
}

// Função para obter histórico de mensagens
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Obter parâmetros da URL
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    // Consultar mensagens do usuário atual usando adminDb
    const querySnapshot = await adminDb
      .collection("chat_history")
      .where("userId", "==", session.user?.id)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const messages = querySnapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as ChatMessage),
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Erro ao obter histórico de chat:", error);
    return NextResponse.json(
      { error: "Falha ao obter histórico de chat" },
      { status: 500 }
    );
  }
}
