import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { UserRole } from '../types';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<string | null>;
    signUp: (email: string, password: string, name: string, role: UserRole, location: string) => Promise<string | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const initAuth = async () => {
            try {
                // Check local session first - this is fast and reliable for persistence
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    setUser(null);
                    setLoading(false);
                    return;
                }

                if (session?.user) {
                    // Immediately set user from session to prevent logout flash on refresh
                    const sessionUser = session.user;
                    const meta = sessionUser.user_metadata;

                    // Set initial user state from session (fast path - no network call)
                    const initialUser: AuthUser = {
                        id: sessionUser.id,
                        email: sessionUser.email || '',
                        name: meta?.name || 'Unknown User',
                        role: meta?.role as UserRole || UserRole.CASHIER,
                        location: meta?.location || 'HQ - Abuja'
                    };
                    setUser(initialUser);
                    setLoading(false);

                    // Then fetch full profile from database in background for updated data
                    try {
                        const fullUser = await authService.getCurrentUser();
                        if (fullUser) {
                            setUser(fullUser);
                        }
                    } catch (profileError) {
                        console.warn('Could not fetch full user profile, using session data:', profileError);
                        // Keep using initialUser from session - no logout
                    }
                } else {
                    // No session found - user is not logged in
                    setUser(null);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setUser(null);
                setLoading(false);
            }
        };

        initAuth();

        // Subscribe to auth state changes - but only for explicit events
        // This prevents race conditions with the initial session check
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event);

            // Skip INITIAL_SESSION - we handle that in initAuth() above
            // This prevents the listener from overwriting our established session
            if (event === 'INITIAL_SESSION') {
                return;
            }

            // For explicit sign out, clear user immediately
            if (event === 'SIGNED_OUT') {
                setUser(null);
                setLoading(false);
                return;
            }

            // For explicit sign in (user just logged in), update user
            if (event === 'SIGNED_IN' && session?.user) {
                try {
                    const authUser = await authService.getCurrentUser();
                    if (authUser) {
                        setUser(authUser);
                    }
                } catch (error) {
                    console.error('Error fetching user on sign in:', error);
                }
                setLoading(false);
            }

            // Handle token refresh - keep user logged in
            if (event === 'TOKEN_REFRESHED' && session?.user) {
                // Session is still valid, no action needed
                console.log('Token refreshed successfully');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string): Promise<string | null> => {
        setLoading(true);
        const { user: authUser, error } = await authService.signIn({ email, password });
        if (authUser) {
            setUser(authUser);
        }
        setLoading(false);
        return error;
    };

    const signUp = async (
        email: string,
        password: string,
        name: string,
        role: UserRole,
        location: string
    ): Promise<string | null> => {
        setLoading(true);
        const { user: authUser, error } = await authService.signUp({
            email,
            password,
            name,
            role,
            location
        });
        if (authUser) {
            setUser(authUser);
        }
        setLoading(false);
        return error;
    };

    const signOut = async () => {
        await authService.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
