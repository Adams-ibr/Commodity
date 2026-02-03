import { supabase } from './supabaseClient';
import { User, UserRole } from '../types';

export interface AuthUser extends User {
    id: string;
    email: string;
}

export interface SignUpData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    location: string;
}

export interface SignInData {
    email: string;
    password: string;
}

export const authService = {
    /**
     * Sign up a new user with role and location metadata
     */
    async signUp(data: SignUpData): Promise<{ user: AuthUser | null; error: string | null }> {
        // Prevent self-registration as Super Admin
        if (data.role === UserRole.SUPER_ADMIN) {
            return { user: null, error: 'Super Admin accounts require administrator invitation.' };
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                    role: data.role,
                    location: data.location
                }
            }
        });

        if (authError) {
            return { user: null, error: authError.message };
        }

        if (!authData.user) {
            return { user: null, error: 'Failed to create user account.' };
        }

        // Return the user object
        return {
            user: {
                id: authData.user.id,
                email: authData.user.email || data.email,
                name: data.name,
                role: data.role,
                location: data.location
            },
            error: null
        };
    },

    /**
     * Sign in with email and password
     */
    async signIn(data: SignInData): Promise<{ user: AuthUser | null; error: string | null }> {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
        });

        if (authError) {
            return { user: null, error: authError.message };
        }

        if (!authData.user) {
            return { user: null, error: 'Login failed.' };
        }

        // Fetch user profile from users table
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile) {
            // Fallback to metadata if profile doesn't exist
            const meta = authData.user.user_metadata;
            return {
                user: {
                    id: authData.user.id,
                    email: authData.user.email || data.email,
                    name: meta?.name || 'Unknown User',
                    role: meta?.role as UserRole || UserRole.CASHIER,
                    location: meta?.location || 'HQ - Abuja'
                },
                error: null
            };
        }

        return {
            user: {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role as UserRole,
                location: profile.location
            },
            error: null
        };
    },

    /**
     * Sign out the current user
     */
    async signOut(): Promise<{ error: string | null }> {
        const { error } = await supabase.auth.signOut();
        return { error: error?.message || null };
    },

    /**
     * Get the current authenticated user
     */
    async getCurrentUser(): Promise<AuthUser | null> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        // Fetch user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            return {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role as UserRole,
                location: profile.location
            };
        }

        // Fallback to metadata
        const meta = user.user_metadata;
        return {
            id: user.id,
            email: user.email || '',
            name: meta?.name || 'Unknown User',
            role: meta?.role as UserRole || UserRole.CASHIER,
            location: meta?.location || 'HQ - Abuja'
        };
    },

    /**
     * Listen to auth state changes
     */
    onAuthStateChange(callback: (user: AuthUser | null) => void) {
        return supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                const authUser = await authService.getCurrentUser();
                callback(authUser);
            } else {
                callback(null);
            }
        });
    }
};
