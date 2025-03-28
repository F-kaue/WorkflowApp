import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import fs from "fs";
import path from "path";

// Caminho para o arquivo JSON
const dataFilePath = path.join(process.cwd(), "data", "tickets.json");

// Garantir que o diretório "data" exista
function ensureDirectoryExists() {
  const dir = path.dirname(dataFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Carregar tickets
function loadTickets() {
  ensureDirectoryExists();
  if (!fs.existsSync(dataFilePath)) return [];
  try {
    const data = fs.readFileSync(dataFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Erro ao carregar tickets:", error);
    return [];
  }
}

// Salvar tickets
function saveTickets(tickets: any[]) {
  ensureDirectoryExists();
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(tickets, null, 2), "utf8");
  } catch (error) {
    console.error("Erro ao salvar tickets:", error);
  }
}

// Método DELETE para excluir um ticket pelo ID
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Extrair ID da URL
    const url = new URL(request.url);
    const ticketId = url.pathname.split("/").pop(); // Pega o último segmento da URL

    if (!ticketId) {
      return NextResponse.json(
        { error: "ID do ticket não fornecido" },
        { status: 400 }
      );
    }

    // Carregar tickets existentes
    const tickets = loadTickets();

    // Encontrar o índice do ticket
    const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId);
    if (ticketIndex === -1) {
      return NextResponse.json(
        { error: "Ticket não encontrado" },
        { status: 404 }
      );
    }

    // Remover ticket
    tickets.splice(ticketIndex, 1);
    saveTickets(tickets);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir ticket:", error);
    return NextResponse.json(
      {
        error: "Falha ao excluir o ticket",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
