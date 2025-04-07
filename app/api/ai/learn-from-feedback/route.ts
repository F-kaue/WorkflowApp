import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-server";
import { Timestamp } from "firebase-admin/firestore";
import OpenAI from "openai";

// Configuração do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    console.log("[learn-from-feedback] Recebendo requisição para aprendizado de feedback");

    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[learn-from-feedback] Erro: OPENAI_API_KEY não configurada");
      return NextResponse.json(
        { 
          success: false,
          error: "Configuração do serviço de IA incompleta"
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log("[learn-from-feedback] Dados recebidos:", body);

    const { messageId, rating, comment, content } = body;

    // Validação dos dados recebidos
    if (!messageId || rating === undefined || rating === null || !comment || !content) {
      console.log("[learn-from-feedback] Dados incompletos:", { messageId, rating, commentLength: comment?.length, contentLength: content?.length });
      return NextResponse.json(
        { error: "Dados incompletos para aprendizado" },
        { status: 400 }
      );
    }

    // Verificar se o rating é negativo (< 3)
    const ratingNumber = Number(rating);
    if (ratingNumber >= 3) {
      console.log("[learn-from-feedback] Rating não é negativo, ignorando");
      return NextResponse.json({ success: true, message: "Feedback positivo não requer aprendizado" });
    }

    // Gerar uma versão melhorada da resposta com base no feedback
    const improvedResponse = await generateImprovedResponse(content, comment);
    
    // Salvar a versão melhorada no Firestore para uso futuro
    if (improvedResponse) {
      await saveImprovedResponse(messageId, content, improvedResponse, comment, ratingNumber);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Feedback processado para aprendizado",
      hasImprovedResponse: !!improvedResponse
    });
  } catch (error) {
    console.error("[learn-from-feedback] Erro:", error);
    return NextResponse.json(
      { error: "Falha ao processar feedback para aprendizado" },
      { status: 500 }
    );
  }
}

// Função para gerar uma versão melhorada da resposta com base no feedback
async function generateImprovedResponse(originalResponse: string, feedback: string): Promise<string | null> {
  try {
    console.log("[learn-from-feedback] Gerando resposta melhorada");
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em melhorar respostas com base em feedback negativo. 
          Sua tarefa é analisar uma resposta original e o feedback negativo fornecido, 
          e então gerar uma versão melhorada da resposta que aborde as preocupações levantadas no feedback.
          Mantenha o mesmo tom e estilo da resposta original, mas corrija os problemas mencionados no feedback.
          Não mencione o feedback diretamente na resposta melhorada.`
        },
        {
          role: "user",
          content: `Resposta original: "${originalResponse}"

Feedback negativo: "${feedback}"

Por favor, gere uma versão melhorada da resposta que aborde as preocupações levantadas no feedback.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const improvedResponse = response.choices[0]?.message?.content;
    console.log("[learn-from-feedback] Resposta melhorada gerada com sucesso");
    
    return improvedResponse || null;
  } catch (error) {
    console.error("[learn-from-feedback] Erro ao gerar resposta melhorada:", error);
    return null;
  }
}

// Função para salvar a versão melhorada no Firestore
async function saveImprovedResponse(
  messageId: string, 
  originalResponse: string, 
  improvedResponse: string, 
  feedback: string, 
  rating: number
): Promise<void> {
  try {
    console.log("[learn-from-feedback] Salvando resposta melhorada no Firestore");
    
    const learningData = {
      messageId,
      originalResponse,
      improvedResponse,
      feedback,
      rating,
      timestamp: Timestamp.now(),
      used: false, // Flag para indicar se esta melhoria já foi utilizada em respostas futuras
      category: detectCategory(originalResponse, feedback) // Detectar categoria do feedback para melhor organização
    };
    
    await adminDb.collection("ai_learning").add(learningData);
    console.log("[learn-from-feedback] Resposta melhorada salva com sucesso");
  } catch (error) {
    console.error("[learn-from-feedback] Erro ao salvar resposta melhorada:", error);
    throw error;
  }
}

// Função para detectar a categoria do feedback
function detectCategory(originalResponse: string, feedback: string): string {
  const combinedText = (originalResponse + " " + feedback).toLowerCase();
  
  // Categorias comuns de problemas
  if (combinedText.includes("incompleto") || combinedText.includes("faltou") || combinedText.includes("mais detalhes")) {
    return "informacao_incompleta";
  }
  
  if (combinedText.includes("confuso") || combinedText.includes("não entendi") || combinedText.includes("clareza")) {
    return "falta_clareza";
  }
  
  if (combinedText.includes("incorreto") || combinedText.includes("errado") || combinedText.includes("não funciona")) {
    return "informacao_incorreta";
  }
  
  if (combinedText.includes("desatualizado") || combinedText.includes("antigo") || combinedText.includes("versão")) {
    return "informacao_desatualizada";
  }
  
  // Categoria padrão
  return "geral";
}