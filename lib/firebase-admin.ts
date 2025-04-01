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
    // Tratamento especial para a chave privada, considerando diferentes formatos possíveis
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || ''
    
    // Verificar se a chave já está no formato correto ou precisa de processamento
    if (privateKey.includes('\\n')) {
      // Substituir \n por quebras de linha reais
      privateKey = privateKey.replace(/\\n/g, '\n')
    } else if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      // Remover aspas extras que podem ter sido adicionadas pelo Vercel
      privateKey = privateKey.slice(1, -1).replace(/\\n/g, '\n')
    }
    
    if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) {
      console.error('Erro crítico: FIREBASE_PRIVATE_KEY inválida ou mal formatada.')
      console.error('Formato atual da chave:', privateKey ? `${privateKey.substring(0, 20)}...` : 'undefined')
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