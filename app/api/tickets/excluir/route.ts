import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import fs from "fs"
import path from "path"

// Caminho para o arquivo JSON que armazenará os tickets
const dataFilePath = path.join(process.cwd(), "data", "tickets.json")

// Garantir que o diretório data exista
function ensureDirectoryExists() {
  const dir = path.join(process.cwd(), "data")
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// Carregar tickets do arquivo
function loadTickets() {
  ensureDirectoryExists()

  if (!fs.existsSync(dataFilePath)) {
    // Criar arquivo com lista inicial vazia
    fs.writeFileSync(dataFilePath, JSON.stringify([]))
    return []
  }

  const data = fs.readFileSync(dataFilePath, "utf8")
  return JSON.parse(data)
}

// Salvar tickets no arquivo
function saveTickets(tickets) {
  ensureDirectoryExists()
  fs.writeFileSync(dataFilePath, JSON.stringify(tickets, null, 2))
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Obter o ID do ticket da URL
    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get("id")

    if (!ticketId) {
      return NextResponse.json({ error: "ID do ticket não fornecido" }, { status: 400 })
    }

    // Carregar tickets existentes
    const tickets = loadTickets()

    // Encontrar e remover o ticket
    const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId)

    if (ticketIndex === -1) {
      return NextResponse.json({ error: "Ticket não encontrado" }, { status: 404 })
    }

    // Remover o ticket
    tickets.splice(ticketIndex, 1)

    // Salvar a lista atualizada
    saveTickets(tickets)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir ticket:", error)
    return NextResponse.json(
      { error: "Falha ao excluir o ticket", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

