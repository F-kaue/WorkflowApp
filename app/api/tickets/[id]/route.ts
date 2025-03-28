import { NextResponse } from "next/server"
import { excluirTicket } from "@/lib/firestore"

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    await excluirTicket(context.params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir ticket:", error)
    return NextResponse.json(
      { error: "Erro ao excluir ticket" },
      { status: 500 }
    )
  }
}
