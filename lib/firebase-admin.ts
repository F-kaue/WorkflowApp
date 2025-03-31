import * as admin from "firebase-admin"

// Verificar se as variáveis de ambiente necessárias estão definidas
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn('Variáveis de ambiente do Firebase Admin não estão configuradas. Alguns recursos podem não funcionar corretamente.')
} else {
  try {
    // Configuração do Firebase Admin
    const firebaseAdminConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
      })
    }

    // Inicializar o app apenas se não tiver sido inicializado
    const apps = admin.apps.length

    if (!apps) {
      admin.initializeApp(firebaseAdminConfig)
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error)
  }
}

// Exportar instância do Firestore (pode ser null se a inicialização falhar)
export const adminDb = admin.apps.length ? admin.firestore() : null