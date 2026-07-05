// =====================================================
// AUTH SERVICE — FIREBASE AUTH
// =====================================================
// Replaces all Supabase Auth calls with Firebase Auth SDK.
// The exported `authService` object keeps the same shape
// so no call sites need to change.
// =====================================================

import {
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    getAuth,
} from 'firebase/auth';
import { firebaseAuth } from './firebaseClient';
import { dbGet, dbCreate, dbUpdate, dbList, COLLECTIONS, Query } from './firestoreDb';
import { User, UserRole } from '../types_commodity';

// ── Primary admin email (preserved from original implementation) ──
const PRIMARY_ADMIN_EMAIL = 'admin@galaltixnig.com';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    locationId?: string;
}

// ── Task 5.1: signIn ─────────────────────────────────────────────
// Uses Firebase signInWithEmailAndPassword. On error, throws an
// Error with the Firebase Auth error message.
async function signIn(email: string, password: string): Promise<AuthUser> {
    let uid: string;
    try {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        uid = credential.user.uid;
    } catch (err: any) {
        throw new Error(err?.message ?? 'Sign in failed');
    }

    // Look up Firestore users profile by Firebase UID (document ID)
    const { data: profile } = await dbGet(COLLECTIONS.USERS, uid);

    if (profile) {
        return {
            id: profile.$id || profile.id,
            email: profile.email,
            name: profile.name || profile.full_name,
            role: profile.role as UserRole,
            locationId: profile.location_id || profile.locationId,
        };
    }

    // Fallback: look up by email (handles migrated accounts where doc ID may differ)
    const { data: users } = await dbList(COLLECTIONS.USERS, [
        Query.equal('email', email),
        Query.limit(1),
    ]);

    if (users && users.length > 0) {
        const u = users[0];
        return {
            id: u.$id || u.id,
            email: u.email,
            name: u.name || u.full_name,
            role: u.role as UserRole,
            locationId: u.location_id || u.locationId,
        };
    }

    // No profile found — return basic info from Firebase Auth
    const firebaseUser = getAuth().currentUser;
    const isAdmin = email === PRIMARY_ADMIN_EMAIL;
    return {
        id: uid,
        email,
        name: firebaseUser?.displayName || (isAdmin ? 'Galaltix Nig Ltd' : email),
        role: isAdmin ? UserRole.SUPER_ADMIN : UserRole.OPERATOR,
    };
}

// ── Task 5.3: signUp ─────────────────────────────────────────────
// Creates the Firebase Auth user, then creates a corresponding
// profile document in the Firestore `users` collection.
async function signUp(
    email: string,
    password: string,
    name: string,
    role: UserRole = UserRole.OPERATOR
): Promise<AuthUser> {
    let uid: string;
    try {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        uid = credential.user.uid;
    } catch (err: any) {
        throw new Error(err?.message ?? 'Sign up failed');
    }

    // Create Firestore profile document keyed by Firebase UID
    await dbCreate(
        COLLECTIONS.USERS,
        {
            email,
            full_name: name,
            name,
            role,
            is_active: true,
            company_id: '00000000-0000-0000-0000-000000000001',
        },
        uid
    );

    return { id: uid, email, name, role };
}

// ── Task 5.2: signOut ────────────────────────────────────────────
async function signOut(): Promise<void> {
    try {
        await firebaseSignOut(firebaseAuth);
    } catch (err) {
        console.error('Error signing out:', err);
    }
}

// ── Task 5.4: getCurrentUser ─────────────────────────────────────
// 1. Get firebaseAuth.currentUser
// 2. If null → return null
// 3. Look up Firestore users profile by Firebase UID
// 4. If no profile → auto-create with role OPERATOR (SUPER_ADMIN for primary admin)
// 5. Return AuthUser
async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const firebaseUser = firebaseAuth.currentUser;
        if (!firebaseUser) return null;

        const uid = firebaseUser.uid;
        const email = firebaseUser.email ?? '';

        // Look up profile by UID (document ID)
        const { data: profile } = await dbGet(COLLECTIONS.USERS, uid);

        if (profile) {
            return {
                id: profile.$id || profile.id,
                email: profile.email,
                name: profile.name || profile.full_name,
                role: profile.role as UserRole,
                locationId: profile.location_id || profile.locationId,
            };
        }

        // No profile by UID — try email lookup for migrated accounts
        const { data: users } = await dbList(COLLECTIONS.USERS, [
            Query.equal('email', email),
            Query.limit(1),
        ]);

        if (users && users.length > 0) {
            const u = users[0];
            return {
                id: u.$id || u.id,
                email: u.email,
                name: u.name || u.full_name,
                role: u.role as UserRole,
                locationId: u.location_id || u.locationId,
            };
        }

        // Task 5.4 / Req 4.5: Auto-create profile with OPERATOR role
        // (SUPER_ADMIN for primary admin email)
        const isAdmin = email === PRIMARY_ADMIN_EMAIL;
        const role = isAdmin ? UserRole.SUPER_ADMIN : UserRole.OPERATOR;
        const name =
            firebaseUser.displayName || (isAdmin ? 'Galaltix Nig Ltd' : email);

        try {
            await dbCreate(
                COLLECTIONS.USERS,
                {
                    email,
                    name,
                    role,
                    is_active: true,
                    company_id: '00000000-0000-0000-0000-000000000001',
                },
                uid
            );
        } catch (createErr) {
            console.warn('Auto-create user profile failed:', createErr);
        }

        return { id: uid, email, name, role };
    } catch {
        return null;
    }
}

// ── updateUserProfile ────────────────────────────────────────────
// Unchanged — already uses dbUpdate from firestoreDb
async function updateUserProfile(
    userId: string,
    updates: Partial<User>
): Promise<boolean> {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.role) payload.role = updates.role;
    if (updates.locationId) payload.location_id = updates.locationId;

    const { error } = await dbUpdate(COLLECTIONS.USERS, userId, payload);
    return !error;
}

// ── Task 5.5: resetUserPassword ──────────────────────────────────
// Replaced Supabase Admin password reset with Firebase
// sendPasswordResetEmail (email-based flow).
async function resetUserPassword(email: string): Promise<boolean> {
    try {
        await sendPasswordResetEmail(firebaseAuth, email);
        return true;
    } catch (err: any) {
        console.error('Password reset failed:', err?.message ?? err);
        return false;
    }
}

// ── Task 5.6: export — no Supabase imports anywhere in this file ─
export const authService = {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    updateUserProfile,
    resetUserPassword,
};
