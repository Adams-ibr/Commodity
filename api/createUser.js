import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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

// Vercel Serverless Function to create a user with admin privileges
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const app = getAdminApp();
        const adminAuth = getAuth(app);
        const adminDb = getFirestore(app);

        // Verify the caller is authenticated via Firebase ID token
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');

        let decoded;
        try {
            decoded = await adminAuth.verifyIdToken(token);
        } catch (tokenError) {
            console.error('Token verification failed:', tokenError);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        const callerUid = decoded.uid;

        // Check if caller has permission (Admin, Super Admin, or Manager)
        const callerDoc = await adminDb.collection('users').doc(callerUid).get();

        if (!callerDoc.exists) {
            return res.status(403).json({ error: 'Could not verify user permissions' });
        }

        const callerProfile = callerDoc.data();
        const allowedRoles = ['Super Admin', 'Admin', 'Manager'];

        // Log the role for debugging purposes
        console.log(`User ${callerUid} attempting to create user. Role: ${callerProfile.role}`);

        if (!allowedRoles.includes(callerProfile.role)) {
            return res.status(403).json({
                error: `Insufficient permissions to create users. Your current role is: '${callerProfile.role}'. Required: Admin, Super Admin, or Manager.`
            });
        }

        const { email, password, name, role, location } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Create user in Firebase Auth
        let newUser;
        try {
            newUser = await adminAuth.createUser({
                email,
                password,
                emailVerified: true,
                displayName: name,
            });
        } catch (authError) {
            console.error('Auth creation error:', authError);
            return res.status(400).json({ error: authError.message });
        }

        // 2. Upsert user profile document in Firestore users collection
        const uid = newUser.uid;
        const userProfile = {
            id: uid,
            email: newUser.email,
            name,
            role,
            location: location ?? null,
            is_active: true,
        };

        try {
            await adminDb.collection('users').doc(uid).set(userProfile, { merge: true });
        } catch (dbError) {
            console.error('Firestore profile write error after Auth creation:', dbError);
            // Auth user was created but Firestore write failed — partial failure
            return res.status(500).json({
                error: 'User created in Auth but failed to create profile: ' + dbError.message
            });
        }

        return res.status(200).json(userProfile);

    } catch (error) {
        console.error('Unexpected error in createUser:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
