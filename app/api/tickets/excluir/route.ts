import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import fs from "fs";
import path from "path";

// Método DELETE para excluir um ticket pelo ID
export async function DELETE(request: Request) {
  try {
    // Pegar o ID do ticket a partir da URL
    const { pathname } = new URL(request.url);
    const parts = pathname.split("/");
    const ticketId = parts[parts.length - 1]; // Última parte da URL

    if (!ticketId) {
      return NextResponse.json({ error: "ID do ticket não fornecido" }, { status: 400 });
    }

    // Verifica se o usuário está autenticado
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Caminho para o arquivo JSON que armazena os tickets
    const dataFilePath = path.join(process.cwd(), "data", "tickets.json");

    // Se o arquivo não existir, retorna erro
    if (!fs.existsSync(dataFilePath)) {
      return NextResponse.json({ error: "Nenhum ticket encontrado" }, { status: 404 });
    }

    // Lê os tickets do arquivo JSON
    const tickets = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));

    // Filtra e remove o ticket com o ID fornecido
    const newTickets = tickets.filter((ticket: any) => ticket.id !== ticketId);

    if (newTickets.length === tickets.length) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 });
    }

    // Salva os tickets atualizados no arquivo
    fs.writeFileSync(dataFilePath, JSON.stringify(newTickets, null, 2), "utf8");

    return NextResponse.json({ success: true, message: "Ticket excluído com sucesso" }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir ticket:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
