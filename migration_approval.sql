-- Add approval workflow columns to reconciliations table
ALTER TABLE reconciliations 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS approved_by text,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;
