import { NextResponse } from "next/server";

export async function DELETE(
  request: Request
) {
  try {
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('id')

    if (!ticketId) {
      return NextResponse.json(
        { error: "ID do ticket não fornecido" },
        { status: 400 }
      );
    }

    // Simulação de remoção do ticket
    console.log(`Deletando ticket com ID: ${ticketId}`);

    return NextResponse.json(
      { success: true, message: "Ticket excluído com sucesso" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao excluir ticket:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}