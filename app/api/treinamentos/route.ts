import { NextResponse } from "next/server"
import { listarTreinamentos, criarTreinamento } from "@/lib/firestore"

export async function GET() {
  try {
    const treinamentos = await listarTreinamentos()
    return NextResponse.json(treinamentos)
  } catch (error) {
    console.error("Erro ao listar treinamentos:", error)
    return NextResponse.json(
      { error: "Erro ao listar treinamentos" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const id = await criarTreinamento(data)
    return NextResponse.json({ id })
  } catch (error) {
    console.error("Erro ao criar treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao criar treinamento" },
      { status: 500 }
    )
  }
}