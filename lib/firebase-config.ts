import * as admin from "firebase-admin"


const firebaseAdminConfig = {
  credential: admin.credential.cert({
    projectId: "gerenciamento-de-tae",
    clientEmail: "firebase-adminsdk-fbsvc@gerenciamento-de-tae.iam.gserviceaccount.com",
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  databaseURL: `https://gerenciamento-de-tae.firebaseio.com`
}

// Inicializa o Firebase Admin apenas se não tiver sido inicializado
const apps = admin.apps.length

if (!apps) {
  admin.initializeApp(firebaseAdminConfig)
}

// Inicializa o Firestore
const db = admin.firestore()

export { db }