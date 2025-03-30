import { NextResponse } from "next/server"
import { excluirTicket } from "@/lib/firestore"

// Implementação simplificada sem uso de params
export async function DELETE(request: Request) {
  try {
    // Extrair o ID da URL
    const url = new URL(request.url)
    const pathSegments = url.pathname.split('/')
    const id = pathSegments[pathSegments.length - 1]
    
    if (!id) {
      return NextResponse.json(
        { error: "ID do ticket é obrigatório" },
        { status: 400 }
      );
    }

    await excluirTicket(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir ticket:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ticket" },
      { status: 500 }
    );
  }
}