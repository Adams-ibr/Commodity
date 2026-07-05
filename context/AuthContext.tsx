import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../services/firebaseClient';
import { authService, AuthUser } from '../services/authService';

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Task 6.1: Subscribe to Firebase Auth state changes (replaces checkSession polling)
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            if (firebaseUser) {
                // Task 6.2: Load full AuthUser profile when signed in
                const profile = await authService.getCurrentUser();
                setUser(profile);
            } else {
                // Req 6.3: Set user to null when signed out
                setUser(null);
            }
            // Task 6.2: Set loading false only after the first event is received
            setLoading(false);
        });

        // Task 6.3: Return unsubscribe for cleanup on unmount
        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        const authUser = await authService.signIn(email, password);
        setUser(authUser);
    };

    const signOut = async () => {
        await authService.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
