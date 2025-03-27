/**
 * @file API de Gerenciamento de Usuários
 * @description Endpoints RESTful para gerenciar usuários do sistema
 * @module api/admin/users
 */

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import { adminDb, adminAuth, assertIsServer } from "@/lib/firebase-admin-server"

// Garantir que este código só execute no servidor
assertIsServer()

/**
 * @typedef {Object} User
 * @property {string} id - ID único do usuário
 * @property {string} name - Nome completo do usuário
 * @property {string} email - Email do usuário
 * @property {string} role - Função do usuário (admin, user, etc)
 * @property {string} [createdAt] - Data de criação do usuário
 */

/**
 * @function GET
 * @description Obtém a lista de usuários ou um usuário específico
 * @param {Request} request - Objeto de requisição
 * @returns {Promise<NextResponse>} Resposta com os dados dos usuários
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
    
    // Obter ID do usuário da query string, se fornecido
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (userId) {
      // Buscar usuário específico
      const userRecord = await adminAuth.getUser(userId)
      
      // Buscar dados adicionais do usuário no Firestore
      const userDoc = await adminDb.collection("users").doc(userId).get()
      const userData = userDoc.exists ? userDoc.data() : {}
      
      return NextResponse.json({
        user: {
          id: userRecord.uid,
          name: userRecord.displayName,
          email: userRecord.email,
          role: userData.role || "user",
          createdAt: userRecord.metadata.creationTime
        }
      })
    } else {
      // Listar todos os usuários (com paginação)
      const listUsersResult = await adminAuth.listUsers(1000)
      
      // Buscar dados adicionais dos usuários no Firestore
      const usersSnapshot = await adminDb.collection("users").get()
      const usersData = {}
      
      usersSnapshot.forEach(doc => {
        usersData[doc.id] = doc.data()
      })
      
      const users = listUsersResult.users.map(userRecord => ({
        id: userRecord.uid,
        name: userRecord.displayName,
        email: userRecord.email,
        role: usersData[userRecord.uid]?.role || "user",
        createdAt: userRecord.metadata.creationTime
      }))
      
      return NextResponse.json({ users })
    }
  } catch (error) {
    console.error("Erro ao obter usuários:", error)
    return NextResponse.json(
      { error: "Falha ao obter usuários" },
      { status: 500 }
    )
  }
}

/**
 * @function POST
 * @description Cria um novo usuário
 * @param {Request} request - Objeto de requisição
 * @returns {Promise<NextResponse>} Resposta com o ID do usuário criado
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
    
    const { name, email, password, role } = await request.json()
    
    // Validar campos obrigatórios
    if (!name || !email) {
      return NextResponse.json(
        { error: "Nome e email são obrigatórios" },
        { status: 400 }
      )
    }
    
    // Criar usuário no Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password: password || Math.random().toString(36).slice(-8), // Senha aleatória se não fornecida
      displayName: name,
      emailVerified: false
    })
    
    // Salvar dados adicionais no Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      name,
      email,
      role: role || "user",
      createdAt: new Date().toISOString()
    })
    
    return NextResponse.json({
      id: userRecord.uid,
      message: "Usuário criado com sucesso"
    })
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error)
    
    // Tratar erros específicos do Firebase Auth
    if (error.code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email já está em uso" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Falha ao criar usuário" },
      { status: 500 }
    )
  }
}

/**
 * @function DELETE
 * @description Exclui um usuário
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
    
    // Obter ID do usuário da query string
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")
    
    if (!userId) {
      return NextResponse.json(
        { error: "ID do usuário não fornecido" },
        { status: 400 }
      )
    }
    
    // Excluir usuário do Firebase Auth
    await adminAuth.deleteUser(userId)
    
    // Excluir dados do usuário do Firestore
    await adminDb.collection("users").doc(userId).delete()
    
    return NextResponse.json({
      success: true,
      message: "Usuário excluído com sucesso"
    })
  } catch (error: any) {
    console.error("Erro ao excluir usuário:", error)
    
    // Tratar erros específicos do Firebase Auth
    if (error.code === "auth/user-not-found") {
      return NextResponse.json(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Falha ao excluir usuário" },
      { status: 500 }
    )
  }
}