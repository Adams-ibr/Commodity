// Quick script to check and fix admin user role in Supabase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://jzxmzdqofozkiatforbe.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eG16ZHFvZm96a2lhdGZvcmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Njk5ODMsImV4cCI6MjA4NzU0NTk4M30.-ZfOX0cud8FOQeaiUA3-n7lYkcNJ1WYkNSH-yeBShT8'
);

async function main() {
    try {
        // 1. Check current users
        const { data: users, error } = await supabase.from('users').select('id, email, name, role, is_active');
        if (error) { console.log('Error:', error.message); process.exit(1); }
        console.log('All users:', JSON.stringify(users, null, 2));

        // 2. Find admin user
        const admin = (users || []).find(u => u.email === 'admin@galaltixnig.com');
        if (admin) {
            console.log('\nAdmin found! Current role:', admin.role);
            if (admin.role !== 'Super Admin') {
                console.log('Updating role to Super Admin...');
                const { error: updateErr } = await supabase
                    .from('users')
                    .update({ role: 'Super Admin' })
                    .eq('email', 'admin@galaltixnig.com');
                if (updateErr) console.log('Update error:', updateErr.message);
                else console.log('Role updated to Super Admin!');
            } else {
                console.log('Role is already Super Admin.');
            }
        } else {
            console.log('\nAdmin user not found in users table. Creating...');
            const { error: insertErr } = await supabase.from('users').insert({
                email: 'admin@galaltixnig.com',
                name: 'Galaltix Nig Ltd',
                role: 'Super Admin',
                is_active: true,
                company_id: '00000000-0000-0000-0000-000000000001'
            });
            if (insertErr) console.log('Insert error:', insertErr.message);
            else console.log('Admin user created with Super Admin role!');
        }
    } catch (e) { console.error(e); }
    process.exit(0);
}

main();
