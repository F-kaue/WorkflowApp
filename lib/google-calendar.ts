import { google } from "googleapis"

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    titulo: string
    sindicato: string
    data: Date
    participantes: string[]
    notas?: string
  },
) {
  try {
    console.log("Criando evento com token:", accessToken)

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Criar o evento
    const googleEvent = {
      summary: event.titulo,
      location: "Online via Google Meet",
      description: `${event.sindicato}\n\n${event.notas || ""}`,
      start: {
        dateTime: event.data.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: new Date(event.data.getTime() + 60 * 60 * 1000).toISOString(), // 1 hora de duração
        timeZone: "America/Sao_Paulo",
      },
      attendees: event.participantes.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      // Garantir que os convites sejam enviados
      sendUpdates: "all",
    }

    console.log("Enviando evento para o Google Calendar:", googleEvent)

    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all", // Garantir que os convites sejam enviados
      requestBody: googleEvent,
    })

    console.log("Resposta do Google Calendar:", response.data)

    return {
      id: response.data.id,
      link: response.data.hangoutLink || response.data.htmlLink,
    }
  } catch (error) {
    console.error("Erro ao criar evento no Google Calendar:", error)
    throw new Error("Falha ao criar evento no Google Calendar")
  }
}

export async function listGoogleCalendarEvents(accessToken: string) {
  try {
    console.log("Listando eventos com token:", accessToken)

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Buscar eventos futuros
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    })

    console.log("Resposta da listagem de eventos:", response.data)

    const eventos =
      response.data.items?.map((event) => {
        // Extrair o sindicato da descrição (primeira linha)
        const descriptionLines = event.description?.split("\n") || []
        const sindicato = descriptionLines[0] || "Não especificado"

        return {
          id: event.id,
          titulo: event.summary,
          sindicato: sindicato,
          data: event.start?.dateTime || event.start?.date,
          participantes: event.attendees?.map((attendee) => attendee.email || "") || [],
          link: event.hangoutLink || event.htmlLink || "",
        }
      }) || []

    return eventos
  } catch (error) {
    console.error("Erro ao listar eventos do Google Calendar:", error)
    throw new Error("Falha ao listar eventos do Google Calendar")
  }
}

