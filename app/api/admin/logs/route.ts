/**
 * @file API de Logs do Sistema
 * @description Endpoints RESTful para gerenciar logs do sistema
 * @module api/admin/logs
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { adminDb, assertIsServer } from "@/lib/firebase-admin-server"

// Garantir que este código só execute no servidor
assertIsServer()

/**
 * @typedef {Object} SystemLog
 * @property {string} id - ID único do log
 * @property {string} action - Ação realizada
 * @property {string} module - Módulo do sistema
 * @property {string} description - Descrição detalhada
 * @property {string} [userName] - Nome do usuário que realizou a ação
 * @property {string} timestamp - Data e hora da ação
 * @property {string} level - Nível do log (info, warning, error, critical)
 */

/**
 * @function GET
 * @description Obtém a lista de logs do sistema com filtros opcionais
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
    
    // Obter parâmetros de consulta
    const { searchParams } = new URL(request.url)
    const level = searchParams.get("level")
    const module = searchParams.get("module")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "100")
    
    // Construir a consulta base
    let query = adminDb.collection("system_logs")
      .orderBy("timestamp", "desc")
      .limit(limit)
    
    // Aplicar filtros se fornecidos
    if (level) {
      query = query.where("level", "==", level)
    }
    
    if (module) {
      query = query.where("module", "==", module)
    }
    
    if (startDate) {
      const startTimestamp = new Date(startDate)
      query = query.where("timestamp", ">=", startTimestamp)
    }
    
    if (endDate) {
      const endTimestamp = new Date(endDate)
      query = query.where("timestamp", "<=", endTimestamp)
    }
    
    // Executar a consulta
    const snapshot = await query.get()
    
    // Formatar os resultados
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }))
    
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
    
    const { action, module, description, level } = await request.json()
    
    // Validar campos obrigatórios
    if (!action || !module || !description || !level) {
      return NextResponse.json(
        { error: "Campos obrigatórios não fornecidos" },
        { status: 400 }
      )
    }
    
    // Validar nível do log
    const validLevels = ["info", "warning", "error", "critical"]
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { error: "Nível de log inválido" },
        { status: 400 }
      )
    }
    
    // Criar o log no Firestore
    const logData = {
      action,
      module,
      description,
      level,
      userName: session.user?.name,
      userEmail: session.user?.email,
      userId: session.user?.id,
      timestamp: new Date()
    }
    
    const docRef = await adminDb.collection("system_logs").add(logData)
    
    return NextResponse.json({
      id: docRef.id,
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
 * @description Exclui logs do sistema (apenas para administradores)
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
    
    const { ids } = await request.json()
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs de logs não fornecidos" },
        { status: 400 }
      )
    }
    
    // Excluir logs em lote usando uma transação
    const batch = adminDb.batch()
    
    ids.forEach(id => {
      const docRef = adminDb.collection("system_logs").doc(id)
      batch.delete(docRef)
    })
    
    await batch.commit()
    
    return NextResponse.json({
      success: true,
      message: `${ids.length} log(s) excluído(s) com sucesso`
    })
  } catch (error) {
    console.error("Erro ao excluir logs:", error)
    return NextResponse.json(
      { error: "Falha ao excluir logs" },
      { status: 500 }
    )
  }
}