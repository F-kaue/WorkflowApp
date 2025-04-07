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
    console.log("[process-feedback] Recebendo requisição para processar feedback");

    // Verificação da API Key
    if (!process.env.OPENAI_API_KEY) {
      console.error("[process-feedback] Erro: OPENAI_API_KEY não configurada");
      return NextResponse.json(
        { 
          success: false,
          error: "Configuração do serviço de IA incompleta"
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log("[process-feedback] Dados recebidos:", body);

    const { ticketId, isPositive, feedback } = body;

    // Validação dos dados recebidos
    if (!ticketId || isPositive === undefined || !feedback) {
      console.log("[process-feedback] Dados incompletos");
      return NextResponse.json(
        { error: "Dados incompletos para processamento de feedback" },
        { status: 400 }
      );
    }

    // Buscar o ticket no Firestore
    const ticketDoc = await adminDb.collection("generated_tickets").doc(ticketId).get();
    if (!ticketDoc.exists) {
      console.log("[process-feedback] Ticket não encontrado");
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data();
    
    // Atualizar o documento do ticket com o feedback
    await adminDb.collection("generated_tickets").doc(ticketId).update({
      hasFeedback: true,
      isPositiveFeedback: isPositive,
      feedback: feedback,
      feedbackTimestamp: Timestamp.now()
    });

    // Se o feedback for negativo, processar para aprendizado
    if (!isPositive) {
      // Gerar uma versão melhorada do ticket com base no feedback
      const improvedTicket = await generateImprovedTicket(ticketData.content, feedback);
      
      if (improvedTicket) {
        // Salvar a versão melhorada no Firestore
        await adminDb.collection("generated_tickets").doc(ticketId).update({
          improvedContent: improvedTicket,
          feedbackProcessed: true,
          processingTimestamp: Timestamp.now()
        });

        // Adicionar à coleção de aprendizado para uso futuro
        await adminDb.collection("ai_learning").add({
          originalContent: ticketData.content,
          improvedContent: improvedTicket,
          feedback: feedback,
          ticketId: ticketId,
          sindicato: ticketData.sindicato || "",
          timestamp: Timestamp.now(),
          used: false,
          category: "ticket_generation"
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Feedback processado com sucesso"
    });
  } catch (error) {
    console.error("[process-feedback] Erro:", error);
    return NextResponse.json(
      { error: "Falha ao processar feedback" },
      { status: 500 }
    );
  }
}

// Função para gerar uma versão melhorada do ticket com base no feedback
async function generateImprovedTicket(originalTicket: string, feedback: string): Promise<string | null> {
  try {
    console.log("[process-feedback] Gerando ticket melhorado");
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em gerenciamento de projetos para sindicatos, focado em melhorar tickets com base em feedback. 
          Sua tarefa é analisar um ticket original e o feedback fornecido, 
          e então gerar uma versão melhorada do ticket que aborde as preocupações levantadas no feedback.
          Mantenha o mesmo formato e estrutura do ticket original, mas corrija os problemas mencionados no feedback.
          Não mencione o feedback diretamente no ticket melhorado.`
        },
        {
          role: "user",
          content: `Ticket original: "${originalTicket}"

Feedback: "${feedback}"

Por favor, gere uma versão melhorada do ticket que aborde as preocupações levantadas no feedback.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const improvedTicket = response.choices[0]?.message?.content;
    console.log("[process-feedback] Ticket melhorado gerado com sucesso");
    
    return improvedTicket || null;
  } catch (error) {
    console.error("[process-feedback] Erro ao gerar ticket melhorado:", error);
    return null;
  }
}