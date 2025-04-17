import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin-server";

export async function POST(request: NextRequest) {
  try {
    const { messageId, rating, comment, content } = await request.json();

    if (!messageId || !rating || !content) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400 }
      );
    }

    // Coleção para armazenar feedbacks e aprendizados
    const feedbacksCollection = adminDb.collection('ai_feedbacks');
    const learningCollection = adminDb.collection('ai_learning');

    // Salvar o feedback detalhado
    await feedbacksCollection.add({
      messageId,
      rating,
      comment,
      content,
      timestamp: new Date(),
      processed: false
    });

    // Se for um feedback negativo com comentário, usar para aprendizado
    if (rating < 3 && comment) {
      // Estrutura para aprendizado
      const learningData = {
        originalContent: content,
        feedback: comment,
        rating,
        timestamp: new Date(),
        category: 'improvement_needed',
        status: 'pending',
        applied: false
      };

      // Salvar para processamento de aprendizado
      await learningCollection.add(learningData);

      // Analisar padrões similares no histórico
      const chatHistory = adminDb.collection('chat_history');
      const similarMessages = await chatHistory
        .where('content', '==', content)
        .get();

      // Se houver mensagens similares, marcar para revisão
      if (!similarMessages.empty) {
        const batch = adminDb.batch();
        similarMessages.docs.forEach((doc: any) => {
          batch.update(doc.ref, {
            needsReview: true,
            relatedFeedback: messageId
          });
        });
        await batch.commit();
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Feedback processado com sucesso",
        learningStatus: rating < 3 ? "scheduled" : "not_needed"
      }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error("Erro ao processar feedback para aprendizado:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro interno ao processar feedback"
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}