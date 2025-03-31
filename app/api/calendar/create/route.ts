import { NextResponse } from "next/server"
import { google } from "googleapis"
import { adminDb } from "@/lib/firebase-admin"

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
})

const calendar = google.calendar({ version: "v3", auth: oauth2Client })

export async function POST(request: Request) {
  try {
    const { summary, description, start, end, attendees } = await request.json()

    // Validar dados
    if (!summary || !description || !start || !end || !attendees) {
      return NextResponse.json(
        { error: "Dados incompletos" },
        { status: 400 }
      )
    }

    // Criar o evento
    const event = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: "America/Fortaleza",
      },
      end: {
        dateTime: end,
        timeZone: "America/Fortaleza",
      },
      attendees: attendees.map((email: string) => ({ email })),
      reminders: {
        useDefault: true,
      },
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      guestsCanSeeOtherGuests: true,
      guestsCanModify: false,
      sendUpdates: "all",
    }

    try {
      const response = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: event,
        sendNotifications: true,
      })

      if (response.data.hangoutLink && adminDb) {
        // Atualizar o treinamento com o link da reunião
        const treinamentosRef = adminDb.collection("treinamentos")
        const snapshot = await treinamentosRef
          .where("titulo", "==", summary)
          .where("dataInicio", "==", new Date(start))
          .limit(1)
          .get()

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            meetLink: response.data.hangoutLink
          })
        }
      }

      return NextResponse.json({
        success: true,
        eventId: response.data.id,
        meetLink: response.data.hangoutLink
      })
    } catch (error: any) {
      console.error("Erro ao criar evento:", error.message)
      return NextResponse.json(
        { error: "Erro ao criar evento no calendário", details: error.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error)
    return NextResponse.json(
      { error: "Erro ao processar requisição" },
      { status: 400 }
    )
  }
}