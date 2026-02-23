// =====================================================
// APPWRITE COLLECTION CONFIGURATION
// =====================================================
// Central registry of Database ID and Collection IDs.
// Create these collections in the Appwrite Console first,
// then paste the IDs here.

export const DATABASE_ID = (import.meta as any).env.VITE_APPWRITE_DATABASE_ID || '699a5d330017f77f9b8b';

// Collection IDs — update these after creating collections in the Appwrite console.
// Using descriptive names as default IDs (Appwrite allows custom IDs on creation).
export const COLLECTIONS = {
    SUPPLIERS: 'suppliers',
    BUYERS: 'buyers',
    COMMODITY_CATEGORIES: 'commodity_categories',
    COMMODITY_TYPES: 'commodity_types',
    COMMODITY_BATCHES: 'commodity_batches',
    PURCHASE_CONTRACTS: 'purchase_contracts',
    SALES_CONTRACTS: 'sales_contracts',
    SHIPMENTS: 'shipments',
    SHIPMENT_BATCHES: 'shipment_batches',
    PROCESSING_ORDERS: 'processing_orders',
    QUALITY_TESTS: 'quality_tests',
    LOCATIONS: 'locations',
    USERS: 'users',
    AUDIT_LOGS: 'audit_logs',
    ACCOUNTS: 'accounts',
    JOURNAL_ENTRIES: 'journal_entries',
    JOURNAL_ENTRY_LINES: 'journal_entry_lines',
    BATCH_MOVEMENTS: 'batch_movements',
    DOCUMENTS: 'documents',
    EXCHANGE_RATES: 'exchange_rates',
    COMPLIANCE_RECORDS: 'compliance_records',
    TRADE_FINANCE: 'trade_finance',
    GOODS_RECEIPTS: 'goods_receipts',
} as const;
