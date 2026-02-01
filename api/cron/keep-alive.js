import { createClient } from '@supabase/supabase-js';

// This API route is called by Vercel Cron to keep Supabase database active
export default async function handler(req, res) {
    // Verify this is a cron request (optional security)
    const authHeader = req.headers.authorization;

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const supabase = createClient(
            process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // Simple query to keep database active
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Ping failed:', error);
            return res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        console.log('Database ping successful at:', new Date().toISOString());

        return res.status(200).json({
            success: true,
            message: 'Database is awake',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Cron error:', err);
        return res.status(500).json({
            success: false,
            error: err.message,
            timestamp: new Date().toISOString()
        });
    }
}
