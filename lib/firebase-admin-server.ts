/**
 * Firebase Admin SDK - Inicialização Segura para Servidor
 * 
 * Este módulo inicializa o Firebase Admin SDK para uso exclusivo no servidor.
 * IMPORTANTE: Este módulo NÃO deve ser importado em componentes do lado do cliente.
 * Use apenas em API routes ou Server Components.
 */

// Verificar se estamos no ambiente do servidor
const isServer = typeof window === 'undefined'

// Inicializar o Firebase Admin SDK apenas no servidor
let admin: any = null
let adminDb: any = null
let adminAuth: any = null

// Inicializar o Firebase Admin SDK apenas no servidor usando dynamic import
if (isServer) {
  // Importação dinâmica para evitar problemas com módulos Node.js no cliente
  import('firebase-admin').then((adminModule) => {
    admin = adminModule
    
    // Verificar se as variáveis de ambiente necessárias estão definidas
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.warn('Variáveis de ambiente do Firebase Admin não estão configuradas. Alguns recursos podem não funcionar corretamente.')
      return
    }
    
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
      if (!admin.apps.length) {
        admin.initializeApp(firebaseAdminConfig)
      }
      
      // Inicializar serviços
      adminDb = admin.firestore()
      adminAuth = admin.auth()
    } catch (error) {
      console.error('Erro ao inicializar Firebase Admin:', error)
    }
  }).catch(error => {
    console.error('Erro ao importar Firebase Admin:', error)
  })
}

// Exportar instâncias do Firestore e Auth
export { adminDb, adminAuth }

/**
 * Função utilitária para verificar se o código está sendo executado no servidor
 * Útil para verificações de segurança adicionais
 */
export function assertIsServer() {
  if (!isServer) {
    throw new Error(
      "Firebase Admin SDK só pode ser usado no servidor. " +
      "Verifique se você não está importando este módulo em um componente do cliente."
    )
  }
}