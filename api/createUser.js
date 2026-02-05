import { createClient } from '@supabase/supabase-js';

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

    // Get environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials in environment variables');
        return res.status(500).json({
            error: 'Server configuration error. Please ensure SUPABASE_SERVICE_ROLE_KEY is set.'
        });
    }

    try {
        // Initialize Supabase Admin client
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the caller is authenticated
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Missing authorization header' });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !caller) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Check if caller has permission (Admin or Super Admin)
        const { data: callerProfile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', caller.id)
            .single();

        if (profileError || !callerProfile) {
            return res.status(403).json({ error: 'Could not verify user permissions' });
        }

        const allowedRoles = ['Super Admin', 'Admin', 'Manager'];

        // Log the role for debugging purposes (remove in strict production if needed)
        console.log(`User ${caller.id} attempting to create user. Role: ${callerProfile.role}`);

        if (!allowedRoles.includes(callerProfile.role)) {
            return res.status(403).json({
                error: `Insufficient permissions to create users. Your current role is: '${callerProfile.role}'. Required: Admin, Super Admin, or Manager.`
            });
        }

        const { email, password, name, role, location } = req.body;

        if (!email || !password || !name || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                name,
                role,
                location
            }
        });

        if (authError) {
            console.error('Auth creation error:', authError);
            return res.status(400).json({ error: authError.message });
        }

        if (!authData.user) {
            return res.status(500).json({ error: 'Failed to generate user' });
        }

        // 2. Create/Update user profile in public.users table
        const { data: userProfile, error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: authData.user.id,
                email: authData.user.email,
                name,
                role,
                location,
                is_active: true
            })
            .select()
            .single();

        if (dbError) {
            console.error('Database insert error:', dbError);
            // Optional: delete auth user if DB insert fails to maintain consistency
            // await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
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
