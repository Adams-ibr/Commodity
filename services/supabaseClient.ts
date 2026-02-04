import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// Create a fail-safe Supabase client
let supabase: SupabaseClient;

try {
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                // Explicitly use localStorage for session storage
                storage: typeof window !== 'undefined' ? window.localStorage : undefined,
                storageKey: 'galaltix-auth-token',
                // Disable flow type for simpler auth flow
                flowType: 'implicit'
            }
        });
        console.log('Supabase client initialized successfully');
    } else {
        console.warn('Supabase credentials missing - using mock client');
        // Create a minimal mock client that won't crash
        supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
    }
} catch (error) {
    console.error('Failed to create Supabase client:', error);
    // Create a minimal mock client as fallback
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };
