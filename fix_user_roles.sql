-- Complete Role Fix for admin@galaltixenergy.com
-- Run ALL of these in Supabase SQL Editor

-- =====================================================
-- STEP 1: Fix RLS policy to allow users to read their own profile
-- =====================================================

-- Drop any existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;

-- Create a simple policy that allows users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Create policy for admins to read all users  
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('Super Admin', 'Admin')
  );

-- =====================================================
-- STEP 2: Update the user's role in the users table
-- =====================================================

UPDATE public.users 
SET role = 'Super Admin' 
WHERE email = 'admin@galaltixenergy.com';

-- =====================================================
-- STEP 3: Also update the auth.users metadata (important!)
-- This ensures both places have the correct role
-- =====================================================

UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "Super Admin"}'::jsonb
WHERE email = 'admin@galaltixenergy.com';

-- =====================================================
-- STEP 4: Verify the changes
-- =====================================================

-- Check public.users table
SELECT id, email, name, role, location 
FROM public.users 
WHERE email = 'admin@galaltixenergy.com';

-- Check auth.users metadata
SELECT id, email, raw_user_meta_data->>'role' as meta_role
FROM auth.users 
WHERE email = 'admin@galaltixenergy.com';

-- =====================================================
-- IMPORTANT: After running this, the user should:
-- 1. Log out completely
-- 2. Log back in
-- The role should now be Super Admin
-- =====================================================
