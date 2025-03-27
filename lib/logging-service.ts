/**
 * @file Serviço de Logs do Sistema
 * @description Funções utilitárias para registrar logs do sistema
 */

import { adminDb, assertIsServer } from "./firebase-admin-server"

// Tipos de logs do sistema
export type LogLevel = 'info' | 'warning' | 'error' | 'critical'

export type SystemLogData = {
  action: string
  module: string
  description: string
  level: LogLevel
  userId?: string
  userName?: string
  userEmail?: string
  metadata?: Record<string, any>
}

/**
 * Registra um log no sistema
 * @param logData Dados do log a ser registrado
 * @returns ID do log registrado
 */
export async function logSystemAction(logData: SystemLogData): Promise<string> {
  // Garantir que este código só execute no servidor
  assertIsServer()
  
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      // Aguardar um momento para dar tempo ao Firebase Admin ser inicializado
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificar novamente
      if (!adminDb) {
        throw new Error("Firebase Admin não está disponível no ambiente atual")
      }
    }
    
    const logEntry = {
      ...logData,
      timestamp: new Date()
    }
    
    const docRef = await adminDb.collection("system_logs").add(logEntry)
    return docRef.id
  } catch (error) {
    console.error("Erro ao registrar log do sistema:", error)
    throw new Error("Falha ao registrar log do sistema")
  }
}

/**
 * Obtém logs do sistema com filtros opcionais
 * @param options Opções de filtro para os logs
 * @returns Array de logs do sistema
 */
export async function getSystemLogs(options: {
  level?: LogLevel
  module?: string
  startDate?: Date
  endDate?: Date
  limit?: number
} = {}): Promise<any[]> {
  // Garantir que este código só execute no servidor
  assertIsServer()
  
  try {
    // Verificar se adminDb está disponível
    if (!adminDb) {
      // Aguardar um momento para dar tempo ao Firebase Admin ser inicializado
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificar novamente
      if (!adminDb) {
        throw new Error("Firebase Admin não está disponível no ambiente atual")
      }
    }
    
    const { level, module, startDate, endDate, limit = 100 } = options
    
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
      query = query.where("timestamp", ">=", startDate)
    }
    
    if (endDate) {
      query = query.where("timestamp", "<=", endDate)
    }
    
    // Executar a consulta
    const snapshot = await query.get()
    
    // Formatar os resultados
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || doc.data().timestamp
    }))
  } catch (error) {
    console.error("Erro ao obter logs do sistema:", error)
    throw new Error("Falha ao obter logs do sistema")
  }
}