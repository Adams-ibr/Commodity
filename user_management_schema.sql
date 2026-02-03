-- User Management Schema Migration for LPG System
-- Run this script in your Supabase SQL Editor

-- 1. FIRST: Drop the existing constraint so we can update the data
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Migrate existing user roles to new role names
UPDATE public.users SET role = 'Admin' WHERE role = 'Depot Manager';
UPDATE public.users SET role = 'Manager' WHERE role = 'Station Manager';
UPDATE public.users SET role = 'Cashier' WHERE role = 'Inventory Officer';
UPDATE public.users SET role = 'Accountant' WHERE role = 'Auditor';
-- Super Admin stays the same

-- 3. Now add the new constraint with valid roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('Super Admin', 'Admin', 'Manager', 'Accountant', 'Cashier'));

-- 2. Add is_active column if not exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 3. Update RLS policies for users table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Super Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Super Admin can update users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admin and Super Admin can view all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
    )
  );

-- Super Admin can manage any user
CREATE POLICY "Super Admin can manage users"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

-- Admin can manage users except Super Admins
CREATE POLICY "Admin can manage non-admin users"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
    AND (SELECT role FROM public.users WHERE id = public.users.id) NOT IN ('Super Admin', 'Admin')
  );

-- Admin can insert new users
CREATE POLICY "Admin can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
    )
    AND role NOT IN ('Super Admin') -- Can't create Super Admin
  );

-- Admin can delete non-admin users
CREATE POLICY "Admin can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('Super Admin', 'Admin')
    )
    AND (SELECT role FROM public.users WHERE id = public.users.id) NOT IN ('Super Admin', 'Admin')
  );

-- 4. Update trigger function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, location, is_active)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown'),
    COALESCE(new.raw_user_meta_data->>'role', 'Cashier'),
    COALESCE(new.raw_user_meta_data->>'location', 'HQ - Abuja'),
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update other RLS policies to use new roles

-- Update inventory_items policies
DROP POLICY IF EXISTS "Managers and Admins can modify inventory" ON public.inventory_items;

CREATE POLICY "Managers and Admins can modify inventory"
  ON public.inventory_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND role IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- Update transactions policies for cashier isolation
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON public.transactions;

-- Admin/Manager/Accountant see all, Cashier sees own only
CREATE POLICY "Role-based transaction viewing"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('Super Admin', 'Admin', 'Manager', 'Accountant')
    )
    OR performed_by = (SELECT name FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Managers can update transactions" ON public.transactions;

CREATE POLICY "Approvers can update transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Super Admin', 'Admin', 'Manager')
    )
  );

-- 6. Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Message to indicate success
DO $$
BEGIN
  RAISE NOTICE 'User management schema migration completed successfully!';
  RAISE NOTICE 'New roles: Super Admin, Admin, Manager, Accountant, Cashier';
END $$;
