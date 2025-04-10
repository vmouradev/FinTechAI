const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

function initializeFirebase() {
    if (admin.apps.length === 0) {
        if (process.env.FIREBASE_KEY_PATH) {
            // Resolve o caminho relativo à raiz do projeto
            const keyPath = path.resolve(process.cwd(), process.env.FIREBASE_KEY_PATH.replace(/^\.\//, ''));
            try {
                const serviceAccount = require(keyPath);

                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
                });
                console.log('Firebase inicializado com sucesso usando arquivo de credenciais');
            } catch (error) {
                console.error('Erro ao carregar arquivo de credenciais:', error);
                console.error('Caminho tentado:', keyPath);
                throw error;
            }
        } else if (process.env.FIREBASE_CREDENTIALS_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
            console.log('Firebase inicializado com sucesso usando JSON de credenciais');
        } else {
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'fintechai',
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
            console.log('Firebase inicializado em modo padrão');
        }
    }

    return admin;
}

module.exports = {
    initializeFirebase,
    admin
};