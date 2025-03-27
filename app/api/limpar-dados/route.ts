import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import fs from "fs"
import path from "path"

// Função para limpar um arquivo JSON específico
function limparArquivo(nomeArquivo: string) {
  try {
    const filePath = path.join(process.cwd(), "data", nomeArquivo)

    // Verificar se o arquivo existe
    if (fs.existsSync(filePath)) {
      // Sobrescrever com um array vazio
      fs.writeFileSync(filePath, JSON.stringify([]))
      return true
    }
    return false
  } catch (error) {
    console.error(`Erro ao limpar ${nomeArquivo}:`, error)
    return false
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Limpar todos os arquivos de dados
    const resultados = {
      sindicatos: limparArquivo("sindicatos.json"),
      tickets: limparArquivo("tickets.json"),
    }

    return NextResponse.json({
      success: true,
      message: "Dados limpos com sucesso",
      resultados,
    })
  } catch (error) {
    console.error("Erro ao limpar dados:", error)
    return NextResponse.json(
      { error: "Falha ao limpar dados", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

