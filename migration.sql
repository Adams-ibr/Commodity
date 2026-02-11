-- Add missing columns to reconciliations table
ALTER TABLE reconciliations 
ADD COLUMN IF NOT EXISTS dealer_sales_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_user_sales_volume numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_user_sales_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pos_cashless numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_payments numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS parameters text;
