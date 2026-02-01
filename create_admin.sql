-- Create Super Admin User for Galaltix Energy
-- Run this in Supabase SQL Editor AFTER creating the user in Authentication

-- STEP 1: First, create the user via Supabase Auth Dashboard:
-- Go to: Authentication > Users > Add User
-- Email: admin@galaltixenergy.com
-- Password: [Set a strong password]

-- STEP 2: Then run this SQL to set the role and location:
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from the Auth dashboard

-- UPDATE public.users
-- SET 
--   role = 'Super Admin',
--   location = 'HQ - Abuja',
--   name = 'System Administrator'
-- WHERE email = 'admin@galaltixenergy.com';

-- Alternative: Insert directly if trigger didn't create the user
-- INSERT INTO public.users (id, email, name, role, location)
-- VALUES (
--   'YOUR_USER_ID_HERE',  -- Copy from Auth > Users
--   'admin@galaltixenergy.com',
--   'System Administrator',
--   'Super Admin',
--   'HQ - Abuja'
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'Super Admin',
--   location = 'HQ - Abuja',
--   name = 'System Administrator';
