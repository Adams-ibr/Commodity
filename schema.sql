-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users Table
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  name text not null,
  role text not null,
  location text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Inventory Items Table
create table if not exists inventory_items (
  id uuid default uuid_generate_v4() primary key,
  location text not null,
  product text not null,
  current_volume numeric default 0,
  max_capacity numeric default 0,
  min_threshold numeric default 0,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'Normal'
);

-- Customers Table
create table if not exists customers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  type text not null, -- 'Dealer' or 'End User'
  contact_phone text,
  contact_email text,
  address text,
  status text default 'Active',
  total_purchases numeric default 0,
  average_transaction_size numeric default 0,
  last_transaction_date timestamp with time zone,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Transactions Table
create table if not exists transactions (
  id uuid default uuid_generate_v4() primary key,
  type text not null, -- 'SALE', 'RECEIPT', 'TRANSFER', 'LOSS'
  product text not null,
  volume numeric not null,
  source_id uuid references inventory_items(id),
  destination text,
  customer_id uuid references customers(id),
  customer_name text,
  reference_doc text unique, -- Invoice Number
  performed_by text,
  status text default 'APPROVED',
  unit_price numeric,
  total_amount numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Prices Table
create table if not exists prices (
  id uuid default uuid_generate_v4() primary key,
  product text not null,
  customer_type text not null,
  price_per_liter numeric default 0,
  updated_by text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Locations Table
create table if not exists locations (
  id uuid default uuid_generate_v4() primary key,
  name text unique not null,
  type text not null, -- 'Depot' or 'Station'
  address text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Audit Logs Table
create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  details text,
  user_id text, -- User name or ID
  user_role text,
  ip_hash text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reconciliations Table (The missing piece!)
create table if not exists reconciliations (
  id uuid default uuid_generate_v4() primary key,
  date date not null,
  location text not null,
  product text not null,
  opening_volume numeric not null,
  expected_volume numeric not null,
  actual_volume numeric not null,
  variance numeric not null,
  variance_percent numeric not null,
  status text not null, -- 'BALANCED', 'VARIANCE_MINOR', 'VARIANCE_MAJOR'
  notes text,
  reconciled_by text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster reconciliation lookups
create index if not exists idx_reconciliations_date on reconciliations(date);
create index if not exists idx_reconciliations_location_product on reconciliations(location, product);

-- Enable Row Level Security (RLS)
alter table users enable row level security;
alter table inventory_items enable row level security;
alter table customers enable row level security;
alter table transactions enable row level security;
alter table prices enable row level security;
alter table locations enable row level security;
alter table audit_logs enable row level security;
alter table reconciliations enable row level security;

-- Create Policies (Simplified for development - allow all access for now)
-- In production, these should be restricted based on auth.uid() and user roles

create policy "Enable all access for all users" on users for all using (true) with check (true);
create policy "Enable all access for all users" on inventory_items for all using (true) with check (true);
create policy "Enable all access for all users" on customers for all using (true) with check (true);
create policy "Enable all access for all users" on transactions for all using (true) with check (true);
create policy "Enable all access for all users" on prices for all using (true) with check (true);
create policy "Enable all access for all users" on locations for all using (true) with check (true);
create policy "Enable all access for all users" on audit_logs for all using (true) with check (true);
create policy "Enable all access for all users" on reconciliations for all using (true) with check (true);
