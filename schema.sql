-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Inventory Items Table
create table public.inventory_items (
  id uuid default uuid_generate_v4() primary key,
  location text not null,
  product text not null,
  current_volume numeric(10, 2) not null default 0,
  max_capacity numeric(10, 2) not null,
  min_threshold numeric(10, 2) not null default 0,
  status text check (status in ('Normal', 'Low', 'Critical')) default 'Normal',
  last_updated timestamptz default now()
);

-- 2. Transactions Table
create table public.transactions (
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

-- 3. Audit Logs Table
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  details text,
  user_id text,
  user_role text,
  ip_hash text,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.inventory_items enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;

-- Policies (For dev simplicity, allow all for now. In prod, restrict by auth.uid())
create policy "Allow generic access inventory" on public.inventory_items for all using (true);
create policy "Allow generic access transactions" on public.transactions for all using (true);
create policy "Allow generic access logs" on public.audit_logs for all using (true);

-- Indexes
create index idx_inventory_product on public.inventory_items(product);
create index idx_transactions_source on public.transactions(source_id);
