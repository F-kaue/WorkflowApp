"use client"

import { Ticket, Treinamento } from "@/lib/types"
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Inicializar Firebase apenas uma vez
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializar Firestore
const db = getFirestore(app);

// Habilitar persistência offline para melhorar desempenho
try {
  if (typeof window !== 'undefined') { // Verificar se está no cliente
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistência não pôde ser habilitada devido a múltiplas abas abertas');
      } else if (err.code === 'unimplemented') {
        console.warn('O navegador não suporta persistência offline');
      }
    });
  }
} catch (error) {
  console.warn('Erro ao configurar persistência:', error);
}

// Funções para tickets
export async function criarTicket(ticket: Omit<Ticket, "id" | "dataCriacao">) {
  try {
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ticket),
    })

    if (!response.ok) {
      throw new Error("Erro ao criar ticket")
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    console.error("Erro ao criar ticket:", error)
    throw error
  }
}

export async function listarTickets() {
  try {
    const response = await fetch("/api/tickets")
    if (!response.ok) {
      throw new Error("Erro ao listar tickets")
    }
    return response.json()
  } catch (error) {
    console.error("Erro ao listar tickets:", error)
    throw error
  }
}

export async function excluirTicket(id: string) {
  try {
    const response = await fetch("/api/tickets", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      throw new Error("Erro ao excluir ticket")
    }
  } catch (error) {
    console.error("Erro ao excluir ticket:", error)
    throw error
  }
}

// Funções para treinamentos
export async function criarTreinamento(treinamento: Omit<Treinamento, "id" | "dataCriacao">) {
  try {
    const response = await fetch("/api/treinamentos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(treinamento),
    })

    if (!response.ok) {
      throw new Error("Erro ao criar treinamento")
    }

    const data = await response.json()
    return data.id
  } catch (error) {
    console.error("Erro ao criar treinamento:", error)
    throw error
  }
}

export async function listarTreinamentos() {
  try {
    const response = await fetch("/api/treinamentos")
    if (!response.ok) {
      throw new Error("Erro ao listar treinamentos")
    }
    return response.json()
  } catch (error) {
    console.error("Erro ao listar treinamentos:", error)
    throw error
  }
}

export async function excluirTreinamento(id: string) {
  try {
    const response = await fetch("/api/treinamentos", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    })

    if (!response.ok) {
      throw new Error("Erro ao excluir treinamento")
    }
  } catch (error) {
    console.error("Erro ao excluir treinamento:", error)
    throw error
  }
}

export { db };