-- =====================================================
-- COMMODITY PROCESSING & EXPORT ERP DATABASE SCHEMA
-- =====================================================
-- This schema transforms the LPG/petroleum system into a comprehensive
-- commodity trading and export ERP system with full financial integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE SYSTEM TABLES
-- =====================================================

-- Companies/Tenants Table (Multi-tenant support)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  registration_number TEXT,
  tax_id TEXT,
  address JSONB,
  contact_info JSONB,
  business_settings JSONB,
  base_currency TEXT DEFAULT 'NGN',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Users Table with department support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  location_id UUID,
  branch_id UUID,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branches and Cost Centers
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address JSONB,
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Locations (Warehouses, Processing Plants, Ports)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  branch_id UUID REFERENCES branches(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL, -- 'WAREHOUSE', 'PROCESSING_PLANT', 'PORT', 'FARM'
  address JSONB,
  capacity_tons DECIMAL(15,3),
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-
- =====================================================
-- COMMODITY MASTER DATA
-- =====================================================

-- Commodity Categories (Grains, Legumes, etc.)
CREATE TABLE IF NOT EXISTS commodity_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commodity Types (Maize, Soybean, etc.)
CREATE TABLE IF NOT EXISTS commodity_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  category_id UUID REFERENCES commodity_categories(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  hs_code TEXT,
  export_eligible BOOLEAN DEFAULT false,
  quality_parameters JSONB, -- Dynamic quality parameters
  packaging_types JSONB,    -- Bag sizes, container types
  standard_unit TEXT DEFAULT 'MT', -- Metric Tons
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Standards and Thresholds
CREATE TABLE IF NOT EXISTS quality_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  commodity_type_id UUID REFERENCES commodity_types(id),
  parameter_name TEXT NOT NULL,
  unit TEXT,
  min_value DECIMAL(10,4),
  max_value DECIMAL(10,4),
  grade_a_max DECIMAL(10,4),
  grade_b_max DECIMAL(10,4),
  grade_c_max DECIMAL(10,4),
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROCUREMENT MANAGEMENT
-- =====================================================

-- Suppliers (Farmers, Aggregators, Cooperatives)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'FARMER', 'AGGREGATOR', 'COOPERATIVE'
  registration_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address JSONB,
  bank_details JSONB,
  tax_info JSONB,
  performance_rating DECIMAL(3,2),
  total_purchases DECIMAL(15,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Contracts
CREATE TABLE IF NOT EXISTS purchase_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  contract_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  commodity_type_id UUID REFERENCES commodity_types(id),
  contract_date DATE NOT NULL,
  delivery_start_date DATE,
  delivery_end_date DATE,
  contracted_quantity DECIMAL(15,3),
  delivered_quantity DECIMAL(15,3) DEFAULT 0,
  price_per_ton DECIMAL(15,2),
  total_value DECIMAL(15,2),
  currency TEXT DEFAULT 'NGN',
  payment_terms TEXT,
  quality_specifications JSONB,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED', 'CANCELLED'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);-- =========
============================================
-- BATCH TRACKING AND INVENTORY
-- =====================================================

-- Commodity Batches (Core traceability unit)
CREATE TABLE IF NOT EXISTS commodity_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  batch_number TEXT UNIQUE NOT NULL,
  commodity_type_id UUID REFERENCES commodity_types(id),
  supplier_id UUID REFERENCES suppliers(id),
  purchase_contract_id UUID REFERENCES purchase_contracts(id),
  location_id UUID REFERENCES locations(id),
  crop_year TEXT,
  received_date DATE,
  received_weight DECIMAL(15,3),
  current_weight DECIMAL(15,3),
  packaging_info JSONB, -- Bags count, bag weight, etc.
  grade TEXT,
  status TEXT DEFAULT 'RECEIVED', -- 'RECEIVED', 'TESTED', 'APPROVED', 'REJECTED', 'PROCESSED', 'SHIPPED'
  cost_per_ton DECIMAL(15,2),
  total_cost DECIMAL(15,2),
  currency TEXT DEFAULT 'NGN',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Batch Movements (Transfers, Processing, Shipments)
CREATE TABLE IF NOT EXISTS batch_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  batch_id UUID REFERENCES commodity_batches(id),
  movement_type TEXT NOT NULL, -- 'TRANSFER', 'PROCESSING_IN', 'PROCESSING_OUT', 'SHIPMENT'
  from_location_id UUID REFERENCES locations(id),
  to_location_id UUID REFERENCES locations(id),
  quantity DECIMAL(15,3),
  movement_date DATE,
  reference_number TEXT,
  performed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- QUALITY CONTROL
-- =====================================================

-- Quality Tests
CREATE TABLE IF NOT EXISTS quality_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  batch_id UUID REFERENCES commodity_batches(id),
  test_number TEXT UNIQUE NOT NULL,
  test_date DATE,
  moisture_percentage DECIMAL(5,2),
  impurity_percentage DECIMAL(5,2),
  aflatoxin_level DECIMAL(8,2),
  protein_content DECIMAL(5,2),
  oil_content DECIMAL(5,2),
  other_parameters JSONB,
  grade_calculated TEXT,
  status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  tested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  lab_certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality Certificates
CREATE TABLE IF NOT EXISTS quality_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  batch_id UUID REFERENCES commodity_batches(id),
  quality_test_id UUID REFERENCES quality_tests(id),
  certificate_number TEXT UNIQUE NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  issued_by UUID REFERENCES users(id),
  certificate_url TEXT,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);-
- =====================================================
-- PROCESSING AND PRODUCTION
-- =====================================================

-- Processing Orders
CREATE TABLE IF NOT EXISTS processing_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  order_number TEXT UNIQUE NOT NULL,
  processing_plant_id UUID REFERENCES locations(id),
  order_date DATE,
  processing_date DATE,
  processing_type TEXT, -- 'CLEANING', 'SORTING', 'PACKAGING', 'BLENDING'
  status TEXT DEFAULT 'PLANNED', -- 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
  supervisor_id UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Inputs (Raw materials consumed)
CREATE TABLE IF NOT EXISTS processing_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_order_id UUID REFERENCES processing_orders(id),
  batch_id UUID REFERENCES commodity_batches(id),
  quantity_consumed DECIMAL(15,3),
  cost_allocated DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing Outputs (Finished products)
CREATE TABLE IF NOT EXISTS processing_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_order_id UUID REFERENCES processing_orders(id),
  output_batch_id UUID REFERENCES commodity_batches(id),
  quantity_produced DECIMAL(15,3),
  yield_percentage DECIMAL(5,2),
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SALES AND EXPORT MANAGEMENT
-- =====================================================

-- Buyers (Export customers)
CREATE TABLE IF NOT EXISTS buyers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'IMPORTER', 'DISTRIBUTOR', 'PROCESSOR'
  country TEXT,
  registration_number TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address JSONB,
  bank_details JSONB,
  credit_limit DECIMAL(15,2),
  payment_terms TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Contracts
CREATE TABLE IF NOT EXISTS sales_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  contract_number TEXT UNIQUE NOT NULL,
  buyer_id UUID REFERENCES buyers(id),
  commodity_type_id UUID REFERENCES commodity_types(id),
  contract_date DATE,
  shipment_period_start DATE,
  shipment_period_end DATE,
  contracted_quantity DECIMAL(15,3),
  shipped_quantity DECIMAL(15,3) DEFAULT 0,
  price_per_ton DECIMAL(15,2),
  total_value DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  incoterms TEXT, -- FOB, CIF, etc.
  destination_port TEXT,
  quality_specifications JSONB,
  status TEXT DEFAULT 'ACTIVE',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);-- Shipmen
ts
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  shipment_number TEXT UNIQUE NOT NULL,
  sales_contract_id UUID REFERENCES sales_contracts(id),
  buyer_id UUID REFERENCES buyers(id),
  vessel_name TEXT,
  container_numbers TEXT[],
  loading_port TEXT,
  destination_port TEXT,
  estimated_departure DATE,
  actual_departure DATE,
  estimated_arrival DATE,
  actual_arrival DATE,
  total_quantity DECIMAL(15,3),
  total_value DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  freight_cost DECIMAL(15,2),
  insurance_cost DECIMAL(15,2),
  other_charges DECIMAL(15,2),
  bill_of_lading TEXT,
  status TEXT DEFAULT 'PLANNED', -- 'PLANNED', 'LOADING', 'SHIPPED', 'DELIVERED'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipment Batches (Batch allocation to shipments)
CREATE TABLE IF NOT EXISTS shipment_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id),
  batch_id UUID REFERENCES commodity_batches(id),
  allocated_quantity DECIMAL(15,3),
  container_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FINANCIAL ACCOUNTING SYSTEM
-- =====================================================

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
  account_subtype TEXT, -- 'CURRENT_ASSET', 'FIXED_ASSET', etc.
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entries (Double-entry accounting)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  entry_number TEXT UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  description TEXT,
  reference_type TEXT, -- 'PURCHASE', 'SALE', 'PROCESSING', 'PAYMENT', 'FX_REVALUATION'
  reference_id UUID,
  total_debit DECIMAL(15,2),
  total_credit DECIMAL(15,2),
  status TEXT DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'REVERSED'
  created_by UUID REFERENCES users(id),
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Journal Entry Lines
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES chart_of_accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  line_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);-
- =====================================================
-- FOREIGN EXCHANGE MANAGEMENT
-- =====================================================

-- Exchange Rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(15,6),
  rate_date DATE,
  source TEXT, -- 'CBN', 'MANUAL', 'API'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Letters of Credit
CREATE TABLE IF NOT EXISTS letters_of_credit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  lc_number TEXT UNIQUE NOT NULL,
  sales_contract_id UUID REFERENCES sales_contracts(id),
  buyer_id UUID REFERENCES buyers(id),
  issuing_bank TEXT,
  advising_bank TEXT,
  amount DECIMAL(15,2),
  currency TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'UTILIZED', 'EXPIRED', 'CANCELLED'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPLIANCE MANAGEMENT (NIGERIA)
-- =====================================================

-- Export Compliance Records
CREATE TABLE IF NOT EXISTS export_compliance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  shipment_id UUID REFERENCES shipments(id),
  nepc_registration TEXT,
  nxp_form_number TEXT,
  phytosanitary_certificate TEXT,
  certificate_of_origin TEXT,
  export_permit TEXT,
  vat_rate DECIMAL(5,2),
  withholding_tax_rate DECIMAL(5,2),
  compliance_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'COMPLIANT', 'NON_COMPLIANT'
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DOCUMENT MANAGEMENT
-- =====================================================

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  reference_type TEXT NOT NULL, -- 'BATCH', 'SHIPMENT', 'CONTRACT', etc.
  reference_id UUID NOT NULL,
  document_type TEXT NOT NULL, -- 'QUALITY_CERTIFICATE', 'INVOICE', 'BILL_OF_LADING', etc.
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  version INTEGER DEFAULT 1,
  uploaded_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ENHANCED AUDIT SYSTEM
-- =====================================================

-- Comprehensive Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES users(id),
  user_role TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);-- ===
==================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Batch tracking indexes
CREATE INDEX IF NOT EXISTS idx_commodity_batches_company_id ON commodity_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_commodity_batches_batch_number ON commodity_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_commodity_batches_status ON commodity_batches(status);
CREATE INDEX IF NOT EXISTS idx_commodity_batches_location ON commodity_batches(location_id);

-- Quality tests indexes
CREATE INDEX IF NOT EXISTS idx_quality_tests_batch_id ON quality_tests(batch_id);
CREATE INDEX IF NOT EXISTS idx_quality_tests_status ON quality_tests(status);

-- Financial indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

-- Shipment indexes
CREATE INDEX IF NOT EXISTS idx_shipments_company_id ON shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipment_batches_shipment_id ON shipment_batches(shipment_id);

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE commodity_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters_of_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;-- =
====================================================
-- BASIC POLICIES (Development - Allow all access)
-- =====================================================
-- Note: In production, these should be restricted based on company_id and user roles

CREATE POLICY "Enable all access for development" ON companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON commodity_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON commodity_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON quality_standards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON purchase_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON commodity_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON batch_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON quality_tests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON quality_certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON processing_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON processing_inputs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON processing_outputs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON buyers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON sales_contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON shipment_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON chart_of_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON journal_entry_lines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON exchange_rates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON letters_of_credit FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON export_compliance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for development" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- STORED PROCEDURES AND FUNCTIONS
-- =====================================================

-- Function to generate batch numbers
CREATE OR REPLACE FUNCTION generate_batch_number(
  p_commodity_type_id UUID,
  p_received_date DATE
) RETURNS TEXT AS $$
DECLARE
  commodity_code TEXT;
  date_str TEXT;
  sequence_num INTEGER;
  batch_number TEXT;
BEGIN
  -- Get commodity code
  SELECT code INTO commodity_code 
  FROM commodity_types 
  WHERE id = p_commodity_type_id;
  
  -- Format date as YYYYMMDD
  date_str := TO_CHAR(p_received_date, 'YYYYMMDD');
  
  -- Get next sequence number for this commodity and date
  SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM commodity_batches
  WHERE commodity_type_id = p_commodity_type_id
  AND received_date = p_received_date;
  
  -- Generate batch number: COMMODITY-YYYYMMDD-001
  batch_number := commodity_code || '-' || date_str || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN batch_number;
END;
$$ LANGUAGE plpgsql;-
- Function to calculate FIFO inventory valuation
CREATE OR REPLACE FUNCTION calculate_fifo_cost(
  p_commodity_type_id UUID,
  p_quantity DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
  remaining_qty DECIMAL := p_quantity;
  total_cost DECIMAL := 0;
  batch_record RECORD;
BEGIN
  -- Get batches in FIFO order (oldest first)
  FOR batch_record IN
    SELECT current_weight, cost_per_ton
    FROM commodity_batches
    WHERE commodity_type_id = p_commodity_type_id
    AND current_weight > 0
    AND status IN ('APPROVED', 'RECEIVED')
    ORDER BY received_date, created_at
  LOOP
    IF remaining_qty <= 0 THEN
      EXIT;
    END IF;
    
    IF batch_record.current_weight >= remaining_qty THEN
      total_cost := total_cost + (remaining_qty * batch_record.cost_per_ton);
      remaining_qty := 0;
    ELSE
      total_cost := total_cost + (batch_record.current_weight * batch_record.cost_per_ton);
      remaining_qty := remaining_qty - batch_record.current_weight;
    END IF;
  END LOOP;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL SEED DATA
-- =====================================================

-- Insert default company (for single-tenant initial deployment)
INSERT INTO companies (id, name, registration_number, base_currency, business_settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Company',
  'RC123456',
  'NGN',
  '{"fiscal_year_start": "01-01", "default_warehouse": null}'
) ON CONFLICT (id) DO NOTHING;

-- Insert basic chart of accounts structure
INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_type) VALUES
('00000000-0000-0000-0000-000000000001', '1000', 'ASSETS', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '1100', 'Current Assets', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '1110', 'Cash and Bank', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '1120', 'Accounts Receivable', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '1130', 'Inventory - Raw Materials', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '1140', 'Inventory - Finished Goods', 'ASSET'),
('00000000-0000-0000-0000-000000000001', '2000', 'LIABILITIES', 'LIABILITY'),
('00000000-0000-0000-0000-000000000001', '2100', 'Current Liabilities', 'LIABILITY'),
('00000000-0000-0000-0000-000000000001', '2110', 'Accounts Payable', 'LIABILITY'),
('00000000-0000-0000-0000-000000000001', '2120', 'Accrued Expenses', 'LIABILITY'),
('00000000-0000-0000-0000-000000000001', '3000', 'EQUITY', 'EQUITY'),
('00000000-0000-0000-0000-000000000001', '3100', 'Share Capital', 'EQUITY'),
('00000000-0000-0000-0000-000000000001', '3200', 'Retained Earnings', 'EQUITY'),
('00000000-0000-0000-0000-000000000001', '4000', 'REVENUE', 'REVENUE'),
('00000000-0000-0000-0000-000000000001', '4100', 'Sales Revenue', 'REVENUE'),
('00000000-0000-0000-0000-000000000001', '4200', 'Other Income', 'REVENUE'),
('00000000-0000-0000-0000-000000000001', '5000', 'EXPENSES', 'EXPENSE'),
('00000000-0000-0000-0000-000000000001', '5100', 'Cost of Goods Sold', 'EXPENSE'),
('00000000-0000-0000-0000-000000000001', '5200', 'Operating Expenses', 'EXPENSE'),
('00000000-0000-0000-0000-000000000001', '5300', 'Administrative Expenses', 'EXPENSE')
ON CONFLICT DO NOTHING;

-- Insert sample commodity categories
INSERT INTO commodity_categories (company_id, name, description) VALUES
('00000000-0000-0000-0000-000000000001', 'Grains', 'Cereal grains for export'),
('00000000-0000-0000-0000-000000000001', 'Legumes', 'Protein-rich legumes and pulses'),
('00000000-0000-0000-0000-000000000001', 'Oilseeds', 'Oil-bearing seeds and nuts')
ON CONFLICT DO NOTHING;