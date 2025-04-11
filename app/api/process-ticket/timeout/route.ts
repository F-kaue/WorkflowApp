import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin-server";

// Configurações importantes para o Vercel
export const dynamic = 'force-dynamic'; // Garante que a rota seja tratada como dinâmica

// Endpoint para marcar um ticket como timeout
export async function POST(request: Request) {
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    // Extrair o ID do ticket da URL
    const url = new URL(request.url);
    const ticketId = url.searchParams.get('ticketId');

    if (!ticketId) {
      return NextResponse.json(
        { 
          success: false,
          error: "ID do ticket não fornecido",
          details: {
            timestamp: new Date().toISOString()
          }
        },
        { status: 400, headers }
      );
    }

    // Verificar se o ticket existe
    const ticketDoc = await adminDb.collection("ticket_queue").doc(ticketId).get();

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { 
          success: false,
          error: "Ticket não encontrado",
          details: {
            ticketId,
            timestamp: new Date().toISOString()
          }
        },
        { status: 404, headers }
      );
    }

    // Atualizar o status do ticket para erro com mensagem de timeout
    await adminDb.collection("ticket_queue").doc(ticketId).update({
      status: "erro",
      mensagem: "Tempo limite excedido. O processamento demorou mais que o esperado.",
      atualizadoEm: new Date(),
      progressoEstimado: 0,
      metadata: {
        error_type: "timeout",
        reported_by: "client",
        timestamp: new Date().toISOString()
      }
    });

    // Retornar sucesso
    return NextResponse.json(
      { 
        success: true,
        message: "Ticket marcado como timeout"
      },
      { headers }
    );

  } catch (error) {
    console.error("[process-ticket/timeout] Erro ao marcar ticket como timeout:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Erro ao marcar ticket como timeout",
        details: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      },
      { status: 500, headers }
    );
  }
}