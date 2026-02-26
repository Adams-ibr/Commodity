-- =====================================================
-- CONTRACT-CENTRIC ERP MIGRATION V2
-- =====================================================

-- 1. Create Purchase Contract Items Table (Multi-item support)
CREATE TABLE IF NOT EXISTS purchase_contract_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES purchase_contracts(id) ON DELETE CASCADE,
  commodity_type_id UUID REFERENCES commodity_types(id),
  grade TEXT,
  packaging_type_id UUID, -- Optional link to packaging_types
  quantity DECIMAL(15,3) NOT NULL,
  delivered_quantity DECIMAL(15,3) DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  pricing_logic JSONB, -- { type: 'FIXED' | 'FORMULA', formula: '...' }
  specifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Sales Contract Items Table (Multi-item support)
CREATE TABLE IF NOT EXISTS sales_contract_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES sales_contracts(id) ON DELETE CASCADE,
  commodity_type_id UUID REFERENCES commodity_types(id),
  grade TEXT,
  quantity DECIMAL(15,3) NOT NULL,
  shipped_quantity DECIMAL(15,3) DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  pricing_logic JSONB,
  specifications JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Existing Tables to Reference Line Items
ALTER TABLE commodity_batches ADD COLUMN IF NOT EXISTS purchase_contract_item_id UUID REFERENCES purchase_contract_items(id);
ALTER TABLE shipment_batches ADD COLUMN IF NOT EXISTS sales_contract_item_id UUID REFERENCES sales_contract_items(id);

-- 4. Add Status Tracking Fields to Base Contracts
-- We might need to handle enum changes if they are already defined as types, 
-- but since we're using TEXT in the schema, we just update constraints or comments.

COMMENT ON COLUMN purchase_contracts.status IS 'DRAFT, SUBMITTED, ACTIVE, PARTIALLY_FULFILLED, FULFILLED, CLOSED, CANCELLED';
COMMENT ON COLUMN sales_contracts.status IS 'DRAFT, SUBMITTED, ACTIVE, SHIPMENT_IN_PROGRESS, PARTIALLY_SHIPPED, FULLY_SHIPPED, CLOSED, CANCELLED';

-- Add Total Amount tracking for multi-item contracts
ALTER TABLE purchase_contracts ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0;
ALTER TABLE sales_contracts ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15,2) DEFAULT 0;

-- 5. Trigger for total amount (Optional, but good for SaaS)
-- For now we will handle totals in the Service layer.

-- 6. Link Invoices to Line Items
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS purchase_contract_item_id UUID REFERENCES purchase_contract_items(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_contract_item_id UUID REFERENCES sales_contract_items(id);
