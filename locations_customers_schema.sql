-- =============================================
-- LOCATIONS & CUSTOMERS SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Locations table (Depots & Stations)
create table if not exists public.locations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('Depot', 'Station')) not null,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Customers table (Dealers & End Users)
create table if not exists public.customers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text check (type in ('Dealer', 'End User')) not null,
  contact_phone text,
  contact_email text,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Enable RLS
alter table public.locations enable row level security;
alter table public.customers enable row level security;

-- 4. RLS Policies - Locations
create policy "Authenticated users can view locations"
  on public.locations for select
  using (auth.uid() is not null);

create policy "Authenticated users can manage locations"
  on public.locations for all
  using (auth.uid() is not null);

-- 5. RLS Policies - Customers
create policy "Authenticated users can view customers"
  on public.customers for select
  using (auth.uid() is not null);

create policy "Authenticated users can manage customers"
  on public.customers for all
  using (auth.uid() is not null);

-- 6. Indexes
create index if not exists idx_locations_type on public.locations(type);
create index if not exists idx_locations_active on public.locations(is_active);
create index if not exists idx_customers_type on public.customers(type);
create index if not exists idx_customers_active on public.customers(is_active);

-- =============================================
-- SCHEMA COMPLETE
-- =============================================
