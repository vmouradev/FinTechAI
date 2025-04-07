// Exporta todos os repositórios e serviços para fácil importação
module.exports = {
    FirestoreRepository,
    MarketDataRepository,
    TradingSignalRepository,
    FirebaseStorageService
};

// Exemplo de configuração para carregar o Firestore - src/config/firebase.js

const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Carrega variáveis de ambiente
dotenv.config();

// Configuração para inicializar o Firebase Admin
function initializeFirebase() {
    // Verifica se já foi inicializado
    if (admin.apps.length === 0) {
        // Se um arquivo de credenciais estiver definido nas variáveis de ambiente
        if (process.env.FIREBASE_KEY_PATH) {
            const serviceAccount = require(process.env.FIREBASE_KEY_PATH);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        }
        // Se as credenciais estiverem em formato JSON nas variáveis de ambiente
        else if (process.env.FIREBASE_CREDENTIALS_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        }
        // Sem credenciais - útil para desenvolvimento local ou ambiente de testes
        else {
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'fintechai-analyzer',
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        }
    }

    return admin;
}

module.exports = {
    initializeFirebase,
    admin
};