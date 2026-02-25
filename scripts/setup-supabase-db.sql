-- =====================================================
-- GALALTIX COMMODITIES — SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this in the Supabase SQL Editor to create all tables.
-- Safe to re-run (uses IF NOT EXISTS).
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──── SUPPLIERS ────
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    registration_number VARCHAR(100),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    bank_details TEXT,
    tax_info TEXT,
    performance_rating DOUBLE PRECISION,
    total_purchases DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── BUYERS ────
CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    country VARCHAR(100),
    registration_number VARCHAR(100),
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    bank_details TEXT,
    credit_limit DOUBLE PRECISION,
    payment_terms VARCHAR(255),
    preferred_currency VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── COMMODITY CATEGORIES ────
CREATE TABLE IF NOT EXISTS commodity_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── COMMODITY TYPES ────
CREATE TABLE IF NOT EXISTS commodity_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    category_id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    hs_code VARCHAR(50),
    export_eligible BOOLEAN,
    quality_parameters TEXT,
    packaging_types TEXT,
    standard_unit VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── COMMODITY BATCHES ────
CREATE TABLE IF NOT EXISTS commodity_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    batch_number VARCHAR(100) NOT NULL,
    commodity_type_id VARCHAR(50) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL,
    purchase_contract_id VARCHAR(50),
    location_id VARCHAR(50) NOT NULL,
    crop_year VARCHAR(10),
    received_date VARCHAR(30) NOT NULL,
    received_weight DOUBLE PRECISION NOT NULL,
    current_weight DOUBLE PRECISION NOT NULL,
    grade VARCHAR(50),
    status VARCHAR(30) NOT NULL,
    cost_per_ton DOUBLE PRECISION NOT NULL,
    total_cost DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) NOT NULL,
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── PURCHASE CONTRACTS ────
CREATE TABLE IF NOT EXISTS purchase_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    contract_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL,
    commodity_type_id VARCHAR(50) NOT NULL,
    contract_date VARCHAR(30) NOT NULL,
    delivery_start_date VARCHAR(30),
    delivery_end_date VARCHAR(30),
    contracted_quantity DOUBLE PRECISION NOT NULL,
    delivered_quantity DOUBLE PRECISION,
    price_per_ton DOUBLE PRECISION NOT NULL,
    total_value DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_terms VARCHAR(500),
    quality_specifications TEXT,
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── SALES CONTRACTS ────
CREATE TABLE IF NOT EXISTS sales_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    contract_number VARCHAR(100) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    commodity_type_id VARCHAR(50) NOT NULL,
    contract_date VARCHAR(30) NOT NULL,
    shipment_period_start VARCHAR(30),
    shipment_period_end VARCHAR(30),
    contracted_quantity DOUBLE PRECISION NOT NULL,
    shipped_quantity DOUBLE PRECISION,
    price_per_ton DOUBLE PRECISION NOT NULL,
    total_value DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) NOT NULL,
    incoterms VARCHAR(20),
    destination_port VARCHAR(255),
    quality_specifications TEXT,
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── SHIPMENTS ────
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    shipment_number VARCHAR(100) NOT NULL,
    sales_contract_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50),
    vessel_name VARCHAR(255),
    container_numbers TEXT,
    loading_port VARCHAR(255),
    destination_port VARCHAR(255),
    estimated_departure VARCHAR(30),
    actual_departure VARCHAR(30),
    estimated_arrival VARCHAR(30),
    actual_arrival VARCHAR(30),
    total_quantity DOUBLE PRECISION,
    total_value DOUBLE PRECISION,
    currency VARCHAR(10),
    freight_cost DOUBLE PRECISION,
    insurance_cost DOUBLE PRECISION,
    other_charges DOUBLE PRECISION,
    bill_of_lading VARCHAR(255),
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── SHIPMENT BATCHES ────
CREATE TABLE IF NOT EXISTS shipment_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    batch_id VARCHAR(50) NOT NULL,
    quantity DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── PROCESSING ORDERS ────
CREATE TABLE IF NOT EXISTS processing_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    processing_type VARCHAR(50) NOT NULL,
    location_id VARCHAR(50) NOT NULL,
    start_date VARCHAR(30) NOT NULL,
    end_date VARCHAR(30),
    input_batches TEXT,
    output_batches TEXT,
    input_weight DOUBLE PRECISION,
    output_weight DOUBLE PRECISION,
    yield_percentage DOUBLE PRECISION,
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── QUALITY TESTS ────
CREATE TABLE IF NOT EXISTS quality_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    batch_id VARCHAR(50) NOT NULL,
    test_number VARCHAR(100) NOT NULL,
    test_date VARCHAR(30) NOT NULL,
    moisture_percentage DOUBLE PRECISION,
    impurity_percentage DOUBLE PRECISION,
    aflatoxin_level DOUBLE PRECISION,
    protein_content DOUBLE PRECISION,
    oil_content DOUBLE PRECISION,
    other_parameters TEXT,
    grade_calculated VARCHAR(50),
    status VARCHAR(30) NOT NULL,
    tested_by VARCHAR(100) NOT NULL,
    approved_by VARCHAR(100),
    approved_at VARCHAR(30),
    rejection_reason TEXT,
    lab_certificate_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── LOCATIONS ────
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    branch_id VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT,
    capacity_tons DOUBLE PRECISION,
    manager_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── USERS ────
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    auth_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── AUDIT LOGS ────
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    ip_hash VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── ACCOUNTS (Chart of Accounts) ────
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    account_code VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    account_subtype VARCHAR(50),
    parent_account_id VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    balance DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── JOURNAL ENTRIES ────
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    entry_number VARCHAR(100) NOT NULL,
    entry_date VARCHAR(30) NOT NULL,
    description TEXT,
    reference_type VARCHAR(100),
    reference_id VARCHAR(100),
    total_debit DOUBLE PRECISION NOT NULL,
    total_credit DOUBLE PRECISION NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_by VARCHAR(50),
    posted_by VARCHAR(50),
    posted_at VARCHAR(30),
    lines TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── JOURNAL ENTRY LINES ────
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id VARCHAR(50) NOT NULL,
    account_id VARCHAR(50) NOT NULL,
    debit_amount DOUBLE PRECISION NOT NULL,
    credit_amount DOUBLE PRECISION NOT NULL,
    description VARCHAR(500),
    line_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── BATCH MOVEMENTS ────
CREATE TABLE IF NOT EXISTS batch_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    batch_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) NOT NULL,
    from_location_id VARCHAR(50),
    to_location_id VARCHAR(50),
    quantity DOUBLE PRECISION NOT NULL,
    movement_date VARCHAR(30) NOT NULL,
    reference_number VARCHAR(100),
    performed_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── DOCUMENTS ────
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(50) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    version INTEGER,
    uploaded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── EXCHANGE RATES ────
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    from_currency VARCHAR(10) NOT NULL,
    to_currency VARCHAR(10) NOT NULL,
    rate DOUBLE PRECISION NOT NULL,
    rate_date VARCHAR(30) NOT NULL,
    source VARCHAR(50) NOT NULL,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── COMPLIANCE RECORDS ────
CREATE TABLE IF NOT EXISTS compliance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    shipment_id VARCHAR(50) NOT NULL,
    nepc_registration VARCHAR(255),
    nxp_form_number VARCHAR(255),
    phytosanitary_certificate VARCHAR(255),
    certificate_of_origin VARCHAR(255),
    export_permit VARCHAR(255),
    ness_fee_paid BOOLEAN,
    ness_amount DOUBLE PRECISION,
    cci_number VARCHAR(255),
    vat_rate DOUBLE PRECISION,
    withholding_tax_rate DOUBLE PRECISION,
    compliance_status VARCHAR(30) NOT NULL,
    verified_by VARCHAR(100),
    verified_at VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── TRADE FINANCE ────
CREATE TABLE IF NOT EXISTS trade_finance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    lc_number VARCHAR(100) NOT NULL,
    sales_contract_id VARCHAR(50) NOT NULL,
    buyer_id VARCHAR(50) NOT NULL,
    issuing_bank VARCHAR(255) NOT NULL,
    advising_bank VARCHAR(255),
    amount DOUBLE PRECISION NOT NULL,
    currency VARCHAR(10) NOT NULL,
    issue_date VARCHAR(30) NOT NULL,
    expiry_date VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──── GOODS RECEIPTS ────
CREATE TABLE IF NOT EXISTS goods_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    receipt_number VARCHAR(100) NOT NULL,
    purchase_contract_id VARCHAR(50) NOT NULL,
    batch_id VARCHAR(50),
    received_date VARCHAR(30) NOT NULL,
    received_quantity DOUBLE PRECISION NOT NULL,
    received_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- ROW LEVEL SECURITY — permissive (matches Appwrite's read("any"))
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'suppliers', 'buyers', 'commodity_categories', 'commodity_types',
            'commodity_batches', 'purchase_contracts', 'sales_contracts',
            'shipments', 'shipment_batches', 'processing_orders', 'quality_tests',
            'locations', 'users', 'audit_logs', 'accounts', 'journal_entries',
            'journal_entry_lines', 'batch_movements', 'documents', 'exchange_rates',
            'compliance_records', 'trade_finance', 'goods_receipts'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Enable all access" ON %I', tbl);
        EXECUTE format(
            'CREATE POLICY "Enable all access" ON %I FOR ALL USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END
$$;


-- =====================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'suppliers', 'buyers', 'commodity_categories', 'commodity_types',
            'commodity_batches', 'purchase_contracts', 'sales_contracts',
            'shipments', 'shipment_batches', 'processing_orders', 'quality_tests',
            'locations', 'users', 'audit_logs', 'accounts', 'journal_entries',
            'journal_entry_lines', 'batch_movements', 'documents', 'exchange_rates',
            'compliance_records', 'trade_finance', 'goods_receipts'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
            tbl, tbl
        );
    END LOOP;
END
$$;

-- ✅ Done! All 23 tables created with RLS and auto-updated timestamps.
