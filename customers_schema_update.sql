-- =============================================
-- CUSTOMERS SCHEMA UPDATE
-- Run this in Supabase SQL Editor to add missing fields
-- =============================================

-- Add missing columns to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS total_purchases numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_transaction_size numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_transaction_date timestamptz;

-- Update the type constraint to match the enum values
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_type_check;

ALTER TABLE public.customers 
ADD CONSTRAINT customers_type_check 
CHECK (type IN ('DEALER', 'END_USER', 'Dealer', 'End User'));

-- Add status constraint
ALTER TABLE public.customers 
ADD CONSTRAINT customers_status_check 
CHECK (status IN ('Active', 'Inactive', 'Suspended'));

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at);

-- =============================================
-- UPDATE COMPLETE
-- =============================================