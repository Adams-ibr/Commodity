import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { authService, AuthUser } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/api';
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
        let isMounted = true;

        // Check for existing session on mount
        const initAuth = async () => {
            try {
                console.log('AuthContext: Initializing auth...');

                // Get session from local storage (fast, no network call)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    if (isMounted) {
                        setUser(null);
                        setLoading(false);
                    }
                    return;
                }

                console.log('AuthContext: Session found?', !!session);

                if (session?.user) {
                    // Build user from session data immediately - NO NETWORK CALLS
                    const sessionUser = session.user;
                    const meta = sessionUser.user_metadata;

                    const initialUser: AuthUser = {
                        id: sessionUser.id,
                        email: sessionUser.email || '',
                        name: meta?.name || 'User',
                        role: meta?.role as UserRole || UserRole.CASHIER,
                        location: meta?.location || 'Default Location'
                    };

                    console.log('AuthContext: Setting user from session:', initialUser.email);

                    if (isMounted) {
                        setUser(initialUser);
                        setLoading(false);
                    }

                    // OPTIONAL: Fetch full profile in background (non-blocking)
                    // Don't let failure affect the logged-in state
                    (async () => {
                        try {
                            const { data: profile } = await supabase
                                .from('users')
                                .select('*')
                                .eq('id', sessionUser.id)
                                .single();

                            if (profile && isMounted) {
                                setUser({
                                    id: profile.id,
                                    email: profile.email,
                                    name: profile.name,
                                    role: profile.role as UserRole,
                                    location: profile.location
                                });
                            }
                        } catch (err) {
                            console.warn('Background profile fetch failed (non-critical):', err);
                        }
                    })();
                } else {
                    console.log('AuthContext: No session found, user not logged in');
                    if (isMounted) {
                        setUser(null);
                        setLoading(false);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (isMounted) {
                    setUser(null);
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state change:', event, 'session?:', !!session);

            // IMPORTANT: Only handle explicit user actions, not automatic events
            switch (event) {
                case 'INITIAL_SESSION':
                    // We already handle this in initAuth above
                    break;

                case 'SIGNED_IN':
                    // User just logged in - update state
                    if (session?.user && isMounted) {
                        const meta = session.user.user_metadata;
                        setUser({
                            id: session.user.id,
                            email: session.user.email || '',
                            name: meta?.name || 'User',
                            role: meta?.role as UserRole || UserRole.CASHIER,
                            location: meta?.location || 'Default Location'
                        });
                        setLoading(false);
                    }
                    break;

                case 'SIGNED_OUT':
                    // User explicitly logged out
                    if (isMounted) {
                        setUser(null);
                        setLoading(false);
                    }
                    break;

                case 'TOKEN_REFRESHED':
                    console.log('Token refreshed successfully');
                    break;

                case 'USER_UPDATED':
                    // User profile was updated
                    if (session?.user && isMounted) {
                        const meta = session.user.user_metadata;
                        setUser(prev => prev ? {
                            ...prev,
                            name: meta?.name || prev.name,
                            role: meta?.role as UserRole || prev.role,
                            location: meta?.location || prev.location
                        } : null);
                    }
                    break;

                default:
                    console.log('Unhandled auth event:', event);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string): Promise<string | null> => {
        setLoading(true);
        const { user: authUser, error } = await authService.signIn({ email, password });
        if (authUser) {
            setUser(authUser);
            // Log successful login
            try {
                // Using a fire-and-forget approach or awaiting it? Awaiting is safer to ensure it's logged.
                // But we don't want to block UI too much? It's fast.
                await api.audit.log('USER_LOGIN', 'User logged in to the system', authUser.name, authUser.role);
            } catch (err) {
                console.error('Failed to log login event:', err);
                // Don't fail the login process just because logging failed
            }
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
