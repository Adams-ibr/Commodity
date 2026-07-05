import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Lazy singleton initialisation — guard against double-init on hot-reload
function getAdminApp() {
    if (getApps().length > 0) {
        return getApp();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Missing Firebase Admin credentials. Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.'
        );
    }

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
}

// This API route is called by Vercel Cron to keep Firestore active
export default async function handler(req, res) {
    // Verify this is a cron request (optional security)
    const authHeader = req.headers.authorization;

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const app = getAdminApp();
        const adminDb = getFirestore(app);

        // Lightweight Firestore read to keep the function warm
        await adminDb.collection('users').limit(1).get();

        console.log('Firestore ping successful at:', new Date().toISOString());

        return res.status(200).json({
            success: true,
            message: 'Database is awake',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Cron error:', err);
        return res.status(500).json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
}
