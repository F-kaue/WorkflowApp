import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { listGoogleCalendarEvents } from "@/lib/google-calendar"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log("Sessão na listagem:", session)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const accessToken = session.accessToken
    console.log("Token de acesso na listagem:", accessToken)

    if (!accessToken) {
      return NextResponse.json({ error: "Token de acesso não disponível" }, { status: 400 })
    }

    const eventos = await listGoogleCalendarEvents(accessToken)
    console.log("Eventos listados:", eventos)

    return NextResponse.json({ eventos })
  } catch (error) {
    console.error("Erro ao listar eventos:", error)
    return NextResponse.json(
      { error: "Falha ao listar os eventos", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

