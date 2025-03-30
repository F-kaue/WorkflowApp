import * as admin from "firebase-admin"

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

// Exportar instância do Firestore
export const adminDb = admin.firestore()