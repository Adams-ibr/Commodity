-- =============================================
-- MARHABA GAS INVENTORY - COMPLETE DATABASE SETUP
-- Run this entire script in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- 1. CORE TABLES
-- =============================================

-- Inventory Items Table
create table if not exists public.inventory_items (
  id uuid default uuid_generate_v4() primary key,
  location text not null,
  product text not null,
  current_volume numeric(10, 2) not null default 0,
  max_capacity numeric(10, 2) not null,
  min_threshold numeric(10, 2) not null default 0,
  status text check (status in ('Normal', 'Low', 'Critical')) default 'Normal',
  last_updated timestamptz default now()
);

-- Transactions Table
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  type text not null,
  product text not null,
  volume numeric(10, 2) not null,
  source_id uuid references public.inventory_items(id),
  destination text,
  customer_id text,
  customer_name text,
  reference_doc text,
  performed_by text,
  status text check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  created_at timestamptz default now()
);

-- Audit Logs Table
create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  details text,
  user_id text,
  user_role text,
  ip_hash text,
  created_at timestamptz default now()
);

-- =============================================
-- 2. USERS TABLE (linked to Supabase Auth)
-- =============================================

create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text not null,
  role text check (role in ('Super Admin', 'Depot Manager', 'Station Manager', 'Inventory Officer', 'Auditor')) not null,
  location text not null,
  created_at timestamptz default now()
);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

alter table public.inventory_items enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.users enable row level security;

-- =============================================
-- 4. RLS POLICIES
-- =============================================

-- Users table policies
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- Inventory policies
create policy "Authenticated users can view inventory"
  on public.inventory_items for select
  using (auth.uid() is not null);

create policy "Authenticated users can modify inventory"
  on public.inventory_items for all
  using (auth.uid() is not null);

-- Transactions policies
create policy "Authenticated users can view transactions"
  on public.transactions for select
  using (auth.uid() is not null);

create policy "Authenticated users can create transactions"
  on public.transactions for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update transactions"
  on public.transactions for update
  using (auth.uid() is not null);

-- Audit logs policies
create policy "Authenticated users can view logs"
  on public.audit_logs for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert logs"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

-- =============================================
-- 5. AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================

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

-- Create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 6. INDEXES FOR PERFORMANCE
-- =============================================

create index if not exists idx_inventory_product on public.inventory_items(product);
create index if not exists idx_transactions_source on public.transactions(source_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at);

-- =============================================
-- SETUP COMPLETE!
-- =============================================
