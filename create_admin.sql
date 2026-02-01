-- =============================================
-- SET USER AS SUPER ADMIN
-- Run this AFTER creating the user in Dashboard
-- =============================================

-- This updates the user profile to Super Admin
UPDATE public.users
SET 
  role = 'Super Admin',
  name = 'System Administrator',
  location = 'HQ - Abuja'
WHERE email = 'admin@galaltixenergy.com';

-- If the above returns 0 rows (trigger didn't create profile), run this:
-- INSERT INTO public.users (id, email, name, role, location)
-- SELECT 
--   id,
--   email,
--   'System Administrator',
--   'Super Admin',
--   'HQ - Abuja'
-- FROM auth.users
-- WHERE email = 'admin@galaltixenergy.com'
-- ON CONFLICT (id) DO UPDATE SET
--   role = 'Super Admin',
--   name = 'System Administrator',
--   location = 'HQ - Abuja';
