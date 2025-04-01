import { NextResponse } from "next/server";
import { google } from "googleapis";
import * as admin from "firebase-admin";

/**
 * API de diagnóstico para verificar o status das credenciais
 * Esta rota é útil para depurar problemas de autenticação no ambiente de produção
 */
export async function GET() {
  const diagnostico = {
    timestamp: new Date().toISOString(),
    ambiente: process.env.NODE_ENV || "desconhecido",
    firebase: await verificarFirebase(),
    googleOAuth: await verificarGoogleOAuth(),
    variaveis: verificarVariaveisAmbiente(),
  };

  // Registrar o diagnóstico no console para depuração
  console.log("Diagnóstico de autenticação:", JSON.stringify(diagnostico, null, 2));

  return NextResponse.json(diagnostico);
}

async function verificarFirebase() {
  try {
    // Verificar se o Firebase Admin está inicializado
    const appsInicializados = admin.apps.length > 0;
    
    let statusFirestore = "não testado";
    
    // Tentar uma operação simples no Firestore se estiver inicializado
    if (appsInicializados) {
      try {
        const db = admin.firestore();
        await db.collection("_diagnostico").doc("teste").set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          ambiente: process.env.NODE_ENV || "desconhecido"
        });
        statusFirestore = "operacional";
      } catch (error: any) {
        statusFirestore = `erro: ${error.message || error}`;
      }
    }
    
    // Verificar formato da chave privada
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    const formatoChave = {
      temChave: !!privateKey,
      tamanho: privateKey.length,
      contemBeginPrivateKey: privateKey.includes("BEGIN PRIVATE KEY"),
      contemQuebraLinha: privateKey.includes("\n"),
      contemBarraN: privateKey.includes("\\n"),
    };
    
    return {
      status: appsInicializados ? "inicializado" : "não inicializado",
      appsInicializados,
      statusFirestore,
      formatoChave,
      projectId: process.env.FIREBASE_PROJECT_ID?.substring(0, 10) + "...",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.substring(0, 10) + "...",
    };
  } catch (error: any) {
    return {
      status: "erro",
      mensagem: error.message || String(error),
    };
  }
}

async function verificarGoogleOAuth() {
  try {
    // Criar cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Configurar refresh token
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';
    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });
    
    let statusToken = "não testado";
    let accessToken = null;
    
    // Tentar atualizar o token
    try {
      const result = await oauth2Client.refreshAccessToken();
      accessToken = result.credentials.access_token?.substring(0, 10) + "...";
      statusToken = "atualizado com sucesso";
    } catch (error: any) {
      statusToken = `erro: ${error.message || error}`;
    }
    
    return {
      status: statusToken,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + "...",
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      refreshTokenPresente: !!refreshToken,
      refreshTokenTamanho: refreshToken.length,
    };
  } catch (error: any) {
    return {
      status: "erro",
      mensagem: error.message || String(error),
    };
  }
}

function verificarVariaveisAmbiente() {
  // Verificar presença das variáveis de ambiente críticas
  const variaveis = {
    firebase: {
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
    },
    google: {
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
    },
    nextauth: {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    },
  };
  
  return variaveis;
}