-- Create prices table
create table public.prices (
  id uuid default uuid_generate_v4() primary key,
  product text not null,
  customer_type text check (customer_type in ('Dealer', 'End User')) not null,
  price_per_liter numeric not null default 0,
  updated_at timestamptz default now(),
  updated_by text,
  unique(product, customer_type)
);

-- Enable RLS
alter table public.prices enable row level security;

-- Policies
create policy "Prices are viewable by everyone" 
  on public.prices for select 
  using (true);

create policy "Prices manageble by admins and managers" 
  on public.prices for all 
  using (
    auth.jwt() ->> 'role' = 'service_role' or 
    (auth.user_id() is not null and 
     exists (
       select 1 from public.users 
       where id = auth.user_id() 
       and role in ('Super Admin', 'Depot Manager')
     ))
  );

-- Indexes
create index idx_prices_lookup on public.prices(product, customer_type);

-- Initial Seed Data (Avoid empty pricing)
insert into public.prices (product, customer_type, price_per_liter, updated_by)
values 
  ('PMS (Petrol)', 'Dealer', 1150, 'System'),
  ('PMS (Petrol)', 'End User', 1200, 'System'),
  ('AGO (Diesel)', 'Dealer', 1400, 'System'),
  ('AGO (Diesel)', 'End User', 1450, 'System'),
  ('DPK (Kerosene)', 'Dealer', 1300, 'System'),
  ('DPK (Kerosene)', 'End User', 1350, 'System'),
  ('LPG (Gas)', 'Dealer', 900, 'System'),
  ('LPG (Gas)', 'End User', 950, 'System')
on conflict (product, customer_type) do nothing;
