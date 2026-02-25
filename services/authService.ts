// =====================================================
// AUTH SERVICE — SUPABASE
// =====================================================
import { supabase } from './supabaseClient';
import { dbList, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { User, UserRole } from '../types_commodity';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    locationId?: string;
}

async function signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);

    const acct = data.user;

    // Look up user profile in our users table
    const { data: users } = await dbList(COLLECTIONS.USERS, [
        Query.equal('email', email),
        Query.limit(1)
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

    // Fallback: return Supabase account info with default role
    return {
        id: acct.id,
        email: acct.email || email,
        name: acct.user_metadata?.full_name || email,
        role: UserRole.OPERATOR,
    };
}

async function signUp(email: string, password: string, name: string, role: UserRole = UserRole.OPERATOR): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
    });
    if (error) throw new Error(error.message);

    const acct = data.user;
    if (!acct) throw new Error('Sign up failed — no user returned');

    // Create user profile in our users table
    await dbCreate(COLLECTIONS.USERS, {
        email,
        full_name: name,
        name,
        role,
        is_active: true,
        auth_id: acct.id,
        company_id: '00000000-0000-0000-0000-000000000001',
    });

    return {
        id: acct.id,
        email,
        name,
        role,
    };
}

async function signOut(): Promise<void> {
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error('Error signing out:', err);
    }
}

async function getCurrentUser(): Promise<AuthUser | null> {
    try {
        const { data: { user: acct } } = await supabase.auth.getUser();
        if (!acct) return null;

        // Look up user profile
        const { data: users } = await dbList(COLLECTIONS.USERS, [
            Query.equal('email', acct.email || ''),
            Query.limit(1)
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

        return {
            id: acct.id,
            email: acct.email || '',
            name: acct.user_metadata?.full_name || acct.email || '',
            role: UserRole.OPERATOR,
        };
    } catch {
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
