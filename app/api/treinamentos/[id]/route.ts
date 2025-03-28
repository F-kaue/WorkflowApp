import { NextResponse } from "next/server"
import { excluirTreinamento } from "@/lib/firestore"

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    await excluirTreinamento(context.params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir treinamento:", error)
    return NextResponse.json(
      { error: "Erro ao excluir treinamento" },
      { status: 500 }
    )
  }
}
