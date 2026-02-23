// =====================================================
// AUTH SERVICE — APPWRITE
// =====================================================
import { account } from './appwriteClient';
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { User, UserRole } from '../types_commodity';
import { ID } from 'appwrite';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    locationId?: string;
}

async function signIn(email: string, password: string): Promise<AuthUser> {
    // Create email/password session
    await account.createEmailPasswordSession(email, password);

    // Get the Appwrite account
    const acct = await account.get();

    // Look up user profile in our users collection
    const { data: users } = await dbList(COLLECTIONS.USERS, [
        Query.equal('email', email),
        Query.limit(1)
    ]);

    if (users && users.length > 0) {
        const u = users[0];
        return {
            id: u.$id || u.id,
            email: u.email,
            name: u.name,
            role: u.role as UserRole,
            locationId: u.location_id || u.locationId,
        };
    }

    // Fallback: return Appwrite account info with default role
    return {
        id: acct.$id,
        email: acct.email,
        name: acct.name || email,
        role: UserRole.OPERATOR,
    };
}

async function signUp(email: string, password: string, name: string, role: UserRole = UserRole.OPERATOR): Promise<AuthUser> {
    // Create Appwrite account
    const acct = await account.create(ID.unique(), email, password, name);

    // Create session
    await account.createEmailPasswordSession(email, password);

    // Create user profile in our users collection
    await dbCreate(COLLECTIONS.USERS, {
        email,
        name,
        role,
        is_active: true,
        appwrite_id: acct.$id,
    });

    return {
        id: acct.$id,
        email,
        name,
        role,
    };
}

async function signOut(): Promise<void> {
    try {
        await account.deleteSession('current');
    } catch (err) {
        console.error('Error signing out:', err);
    }
}

async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const acct = await account.get();

        // Look up user profile
        const { data: users } = await dbList(COLLECTIONS.USERS, [
            Query.equal('email', acct.email),
            Query.limit(1)
        ]);

        if (users && users.length > 0) {
            const u = users[0];
            return {
                id: u.$id || u.id,
                email: u.email,
                name: u.name,
                role: u.role as UserRole,
                locationId: u.location_id || u.locationId,
            };
        }

        return {
            id: acct.$id,
            email: acct.email,
            name: acct.name || acct.email,
            role: UserRole.OPERATOR,
        };
    } catch {
        // No active session
        return null;
    }
}

async function updateUserProfile(userId: string, updates: Partial<User>): Promise<boolean> {
    const payload: any = {};
    if (updates.name) payload.name = updates.name;
    if (updates.role) payload.role = updates.role;
    if (updates.locationId) payload.location_id = updates.locationId;

    const { error } = await dbUpdate(COLLECTIONS.USERS, userId, payload);
    return !error;
}

export const authService = {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    updateUserProfile,
};
