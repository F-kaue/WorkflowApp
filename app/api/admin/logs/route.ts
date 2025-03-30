/**
 * @file API de Gerenciamento de Logs do Sistema
 * @description Endpoints RESTful para gerenciar logs do sistema
 * @module api/admin/logs
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { adminDb, assertIsServer } from "@/lib/firebase-admin-server"
import { getSystemLogs, logSystemAction, LogLevel } from "@/lib/logging-service"

// Garantir que este código só execute no servidor
assertIsServer()

/**
 * @function GET
 * @description Obtém logs do sistema com filtros opcionais
 * @param {Request} request - Objeto de requisição
 * @returns {Promise<NextResponse>} Resposta com os logs do sistema
 */
export async function GET(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verificar se o usuário tem permissão de administrador
    // Implementar lógica de verificação de permissão aqui
    
    // Obter parâmetros de filtro da query string
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level") as LogLevel | undefined
    const module = searchParams.get("module") || undefined
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")
    const limitStr = searchParams.get("limit")
    
    // Converter parâmetros
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined
    const limit = limitStr ? parseInt(limitStr, 10) : 100
    
    // Obter logs com os filtros fornecidos
    const logs = await getSystemLogs({
      level,
      module,
      startDate,
      endDate,
      limit
    })
    
    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Erro ao obter logs do sistema:", error)
    return NextResponse.json(
      { error: "Falha ao obter logs do sistema" },
      { status: 500 }
    )
  }
}

/**
 * @function POST
 * @description Registra um novo log no sistema
 * @param {Request} request - Objeto de requisição
 * @returns {Promise<NextResponse>} Resposta com o ID do log criado
 */
export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verificar se o usuário tem permissão de administrador
    // Implementar lógica de verificação de permissão aqui
    
    const logData = await request.json()
    
    // Validar campos obrigatórios
    if (!logData.action || !logData.module || !logData.description || !logData.level) {
      return NextResponse.json(
        { error: "Campos obrigatórios não fornecidos" },
        { status: 400 }
      )
    }
    
    // Adicionar informações do usuário atual se não fornecidas
    if (!logData.userId && session.user) {
      logData.userId = session.user.id || undefined
      logData.userName = session.user.name || undefined
      logData.userEmail = session.user.email || undefined
    }
    
    // Registrar o log
    const logId = await logSystemAction(logData)
    
    return NextResponse.json({
      id: logId,
      message: "Log registrado com sucesso"
    })
  } catch (error) {
    console.error("Erro ao registrar log:", error)
    return NextResponse.json(
      { error: "Falha ao registrar log" },
      { status: 500 }
    )
  }
}

/**
 * @function DELETE
 * @description Exclui logs do sistema (com filtros ou por ID)
 * @param {Request} request - Objeto de requisição
 * @returns {Promise<NextResponse>} Resposta de sucesso ou erro
 */
export async function DELETE(request: Request) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    // Verificar se o usuário tem permissão de administrador
    // Implementar lógica de verificação de permissão aqui
    
    // Obter parâmetros da query string
    const { searchParams } = new URL(request.url)
    const logId = searchParams.get("id")
    const olderThan = searchParams.get("olderThan") // formato: YYYY-MM-DD
    
    if (logId) {
      // Excluir um log específico
      await adminDb.collection("system_logs").doc(logId).delete()
      
      return NextResponse.json({
        success: true,
        message: "Log excluído com sucesso"
      })
    } else if (olderThan) {
      // Excluir logs mais antigos que a data especificada
      const date = new Date(olderThan)
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: "Data inválida" },
          { status: 400 }
        )
      }
      
      // Buscar logs mais antigos que a data especificada
      const snapshot = await adminDb.collection("system_logs")
        .where("timestamp", "<", date)
        .get()
      
      // Excluir os logs encontrados em lotes
      const batch = adminDb.batch()
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref)
      })
      
      await batch.commit()
      
      return NextResponse.json({
        success: true,
        message: `${snapshot.size} logs excluídos com sucesso`
      })
    } else {
      return NextResponse.json(
        { error: "Parâmetros de exclusão não fornecidos" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Erro ao excluir logs:", error)
    return NextResponse.json(
      { error: "Falha ao excluir logs" },
      { status: 500 }
    )
  }
}
