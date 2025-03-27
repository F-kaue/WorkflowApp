import { NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"

export async function GET() {
  try {
    // Buscar participantes da coleção de participantes
    const participantesRef = adminDb.collection("participantes")
    const participantesSnap = await participantesRef.get()
    const participantesSalvos = participantesSnap.docs.map(doc => doc.data())

    // Buscar participantes de treinamentos anteriores
    const treinamentosRef = adminDb.collection("treinamentos")
    const treinamentosSnap = await treinamentosRef.get()
    
    // Contar frequência de cada email
    const emailFrequencia: { [key: string]: number } = {}
    treinamentosSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.participantes && Array.isArray(data.participantes)) {
        data.participantes.forEach((email: string) => {
          emailFrequencia[email] = (emailFrequencia[email] || 0) + 1
        })
      }
    })

    // Combinar emails salvos com frequência
    const todosEmails = new Set([
      ...participantesSalvos.map(p => p.email),
      ...Object.keys(emailFrequencia)
    ])

    // Criar lista final ordenada por frequência
    const participantes = Array.from(todosEmails).map(email => ({
      email,
      frequencia: emailFrequencia[email] || 0
    })).sort((a, b) => b.frequencia - a.frequencia)

    return NextResponse.json({ participantes })
  } catch (error) {
    console.error("Erro ao buscar participantes:", error)
    return NextResponse.json(
      { error: "Erro ao buscar participantes" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { participantes } = await request.json()

    if (!participantes || !Array.isArray(participantes)) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      )
    }

    const batch = adminDb.batch()
    const participantesRef = adminDb.collection("participantes")

    // Verificar duplicatas antes de salvar
    const existingSnap = await participantesRef.get()
    const existingEmails = new Set(existingSnap.docs.map(doc => doc.data().email))

    for (const participante of participantes) {
      if (!existingEmails.has(participante.email)) {
        const docRef = participantesRef.doc()
        batch.set(docRef, participante)
      }
    }

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar participantes:", error)
    return NextResponse.json(
      { error: "Erro ao salvar participantes" },
      { status: 500 }
    )
  }
}
