import * as admin from "firebase-admin"

// Função para inicializar o Firebase Admin com tratamento de erros aprimorado
function initializeFirebaseAdmin() {
  try {
    // Verificar se as variáveis de ambiente necessárias estão definidas
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error('Erro crítico: Variáveis de ambiente do Firebase Admin não estão configuradas.')
      console.error('Verifique se FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY estão definidas.')
      return false
    }

    // Verificar se o app já foi inicializado
    if (admin.apps.length > 0) {
      console.log('Firebase Admin já inicializado, reutilizando instância existente.')
      return true
    }

    // Configuração do Firebase Admin
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    if (!privateKey) {
      console.error('Erro crítico: FIREBASE_PRIVATE_KEY inválida ou mal formatada.')
      return false
    }

    const firebaseAdminConfig = {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
      })
    }

    // Inicializar o app
    admin.initializeApp(firebaseAdminConfig)
    console.log('Firebase Admin inicializado com sucesso.')
    return true
  } catch (error) {
    console.error('Erro crítico ao inicializar Firebase Admin:', error)
    return false
  }
}

// Tentar inicializar o Firebase Admin
const isInitialized = initializeFirebaseAdmin()

// Exportar instância do Firestore (pode ser null se a inicialização falhar)
export const adminDb = isInitialized && admin.apps.length ? admin.firestore() : null

// Se adminDb for null, registrar um aviso claro
if (!adminDb) {
  console.error('AVISO: adminDb é null. As operações do Firestore Admin falharão.')
}