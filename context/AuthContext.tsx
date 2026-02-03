import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
                // Check local session first (faster and more reliable for persistence)
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // Update state with session user immediately to prevent flash of login
                    // Then verify/fetch full profile
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                } else {
                    // Double check with getUser just in case
                    const currentUser = await authService.getCurrentUser();
                    setUser(currentUser);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initAuth();

        // Subscribe to auth state changes
        const { data: { subscription } } = authService.onAuthStateChange((authUser) => {
            setUser(authUser);
            setLoading(false);
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
