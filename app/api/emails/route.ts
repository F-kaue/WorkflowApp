import { NextResponse } from "next/server"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, writeBatch, QueryDocumentSnapshot, DocumentData } from "firebase/firestore"

export async function DELETE(request: Request) {
  try {
    const { email } = await request.json()
    const batch = writeBatch(db)

    // Buscar todos os treinamentos que contêm o email
    const treinamentosRef = collection(db, "treinamentos")
    const q = query(treinamentosRef, where("participantes", "array-contains", email))
    const querySnapshot = await getDocs(q)

    // Remover o email de cada treinamento
    querySnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const treinamento = doc.data()
      const participantesAtualizados = treinamento.participantes.filter(
        (p: string) => p !== email
      )
      batch.update(doc.ref, { participantes: participantesAtualizados })
    })

    // Executar todas as atualizações em batch
    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir email:", error)
    return NextResponse.json(
      { error: "Erro ao excluir email" },
      { status: 500 }
    )
  }
}
