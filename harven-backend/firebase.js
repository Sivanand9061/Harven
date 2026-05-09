const admin = require('firebase-admin');

// ============================================
// FIREBASE ADMIN INITIALIZATION
// ============================================
// Reads credentials from environment variables set in .env
// These map to fields in your Firebase service account JSON

let db;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId:     process.env.FIREBASE_PROJECT_ID,
            clientEmail:   process.env.FIREBASE_CLIENT_EMAIL,
            // The private key comes as a single escaped string in .env —
            // we need to replace \n with actual newlines
            privateKey:    process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        })
    });
}

db = admin.firestore();

// Use consistent timestamps across all writes
db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db };
