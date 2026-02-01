-- Users table linked to Supabase Auth
-- Run this in your Supabase SQL Editor

-- 1. Create users table
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text not null,
  role text check (role in ('Super Admin', 'Depot Manager', 'Station Manager', 'Inventory Officer', 'Auditor')) not null,
  location text not null,
  created_at timestamptz default now()
);

-- 2. Enable RLS
alter table public.users enable row level security;

-- 3. RLS Policies for users table

-- Users can view their own profile
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

-- Super Admin can view all users
create policy "Super Admin can view all users"
  on public.users for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'Super Admin'
    )
  );

-- Super Admin can update any user
create policy "Super Admin can update users"
  on public.users for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'Super Admin'
    )
  );

-- New users can insert their own profile during registration
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- 4. Create a function to handle new user signup
-- This syncs auth.users with public.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role, location)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
    coalesce(new.raw_user_meta_data->>'role', 'Inventory Officer'),
    coalesce(new.raw_user_meta_data->>'location', 'HQ - Abuja')
  );
  return new;
end;
$$ language plpgsql security definer;

-- 5. Create trigger to auto-create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Update existing RLS policies for other tables to use auth

-- Update inventory_items policies
drop policy if exists "Allow generic access inventory" on public.inventory_items;

create policy "Authenticated users can view inventory"
  on public.inventory_items for select
  using (auth.uid() is not null);

create policy "Managers and Admins can modify inventory"
  on public.inventory_items for all
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() 
      and role in ('Super Admin', 'Depot Manager', 'Station Manager')
    )
  );

-- Update transactions policies
drop policy if exists "Allow generic access transactions" on public.transactions;

create policy "Authenticated users can view transactions"
  on public.transactions for select
  using (auth.uid() is not null);

create policy "Authenticated users can create transactions"
  on public.transactions for insert
  with check (auth.uid() is not null);

create policy "Managers can update transactions"
  on public.transactions for update
  using (
    exists (
      select 1 from public.users
      where id = auth.uid()
      and role in ('Super Admin', 'Depot Manager', 'Station Manager')
    )
  );

-- Update audit_logs policies
drop policy if exists "Allow generic access logs" on public.audit_logs;

create policy "Authenticated users can view logs"
  on public.audit_logs for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);
