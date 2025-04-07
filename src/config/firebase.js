const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

function initializeFirebase() {
    if (admin.apps.length === 0) {
        if (process.env.FIREBASE_KEY_PATH) {
            const serviceAccount = require(process.env.FIREBASE_KEY_PATH);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        } else if (process.env.FIREBASE_CREDENTIALS_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.FIREBASE_STORAGE_BUCKET
            });
        } else {
            admin.initializeApp({
                projectId: process.env.FIREBASE_PROJECT_ID || 'fintechai',
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