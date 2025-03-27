import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { createGoogleCalendarEvent } from "@/lib/google-calendar"

// Função para adicionar um sindicato
async function addSindicato(nome: string) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL}/api/sindicatos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nome }),
    })
  } catch (error) {
    console.error("Erro ao salvar sindicato:", error)
    // Não interromper o fluxo principal se falhar
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    console.log("Sessão:", session)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const accessToken = session.accessToken
    console.log("Token de acesso:", accessToken)

    if (!accessToken) {
      return NextResponse.json({ error: "Token de acesso não disponível" }, { status: 400 })
    }

    const data = await request.json()
    console.log("Dados recebidos:", data)

    // Validar dados
    if (!data.titulo || !data.sindicato || !data.data || !data.participantes || data.participantes.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    // Salvar o sindicato para uso futuro
    await addSindicato(data.sindicato)

    // Criar evento no Google Calendar
    const eventData = {
      titulo: data.titulo,
      sindicato: data.sindicato,
      data: new Date(data.data),
      participantes: data.participantes,
      notas: data.notas,
    }

    console.log("Criando evento com dados:", eventData)

    const result = await createGoogleCalendarEvent(accessToken, eventData)
    console.log("Resultado da criação do evento:", result)

    return NextResponse.json({
      success: true,
      eventId: result.id,
      meetLink: result.link,
    })
  } catch (error) {
    console.error("Erro ao criar treinamento:", error)
    return NextResponse.json(
      { error: "Falha ao criar o treinamento", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

