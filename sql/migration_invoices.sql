-- =====================================================
-- INVOICE MANAGEMENT TABLE MIGRATION
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  type TEXT NOT NULL DEFAULT 'SALES', -- 'SALES' or 'PURCHASE'
  invoice_number TEXT UNIQUE NOT NULL,
  buyer_id UUID,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_address TEXT,
  supplier_id UUID,
  supplier_name TEXT,
  sales_contract_id UUID REFERENCES sales_contracts(id),
  sales_contract_number TEXT,
  purchase_contract_id UUID REFERENCES purchase_contracts(id),
  purchase_contract_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  payment_terms TEXT,
  status TEXT DEFAULT 'DRAFT',
  paid_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer_name ON invoices(buyer_name);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy (Allow all for development as per other tables)
CREATE POLICY "Enable all access for development" ON invoices FOR ALL USING (true) WITH CHECK (true);
