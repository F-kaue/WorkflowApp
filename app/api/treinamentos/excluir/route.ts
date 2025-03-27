import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { google } from "googleapis"

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const accessToken = session.accessToken

    if (!accessToken) {
      return NextResponse.json({ error: "Token de acesso não disponível" }, { status: 400 })
    }

    // Obter o ID do evento da URL
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("id")

    if (!eventId) {
      return NextResponse.json({ error: "ID do evento não fornecido" }, { status: 400 })
    }

    // Configurar cliente do Google Calendar
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Excluir o evento
    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
      sendUpdates: "all", // Notificar participantes sobre o cancelamento
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir treinamento:", error)
    return NextResponse.json(
      { error: "Falha ao excluir o treinamento", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

