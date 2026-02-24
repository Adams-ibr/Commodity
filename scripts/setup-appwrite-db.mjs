#!/usr/bin/env node
// =====================================================
// APPWRITE DATABASE SETUP SCRIPT  (with retry logic)
// Creates all 23 collections + attributes automatically.
//
// USAGE:
//   APPWRITE_API_KEY=your_key node scripts/setup-appwrite-db.mjs
// =====================================================

import { Client, Databases } from 'node-appwrite';

// ──── CONFIG ────
const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '699a5d330017f77f9b8b';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = '699cdd380016ac8b1a41';

if (!API_KEY) {
    console.error('\n❌  Set APPWRITE_API_KEY env variable first.\n');
    process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Retry wrapper — retries up to 3 times with backoff
async function retry(fn, label, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        try {
            return await fn();
        } catch (e) {
            if (e.code === 409) return 'EXISTS'; // already exists
            if (i === attempts) {
                console.error(`    ❌  ${label}: ${e.message} (gave up after ${attempts} tries)`);
                return 'FAIL';
            }
            const wait = 2000 * i; // 2s, 4s, 6s
            await sleep(wait);
        }
    }
}

// ──── ATTRIBUTE HELPERS ────
async function addString(cid, key, size, req = false) {
    return retry(() => db.createStringAttribute(DATABASE_ID, cid, key, size, req), `${cid}.${key}`);
}
async function addFloat(cid, key, req = false) {
    return retry(() => db.createFloatAttribute(DATABASE_ID, cid, key, req), `${cid}.${key}`);
}
async function addInteger(cid, key, req = false) {
    return retry(() => db.createIntegerAttribute(DATABASE_ID, cid, key, req), `${cid}.${key}`);
}
async function addBoolean(cid, key, req = false) {
    return retry(() => db.createBooleanAttribute(DATABASE_ID, cid, key, req), `${cid}.${key}`);
}

async function createCollection(id, name) {
    const res = await retry(() => db.createCollection(DATABASE_ID, id, name, [
        'read("any")', 'create("any")', 'update("any")', 'delete("any")'
    ]), `Collection ${name}`);
    if (res === 'EXISTS') console.log(`  ⏭️   ${name} (${id}) — already exists`);
    else if (res === 'FAIL') return false;
    else console.log(`  ✅  ${name} (${id})`);
    return true;
}

// ──── COLLECTION DEFINITIONS ────
const COLS = [
    {
        id: 'suppliers', name: 'Suppliers', a: [
            ['s', 'company_id', 50, 1], ['s', 'name', 255, 1], ['s', 'type', 50, 1], ['s', 'registration_number', 100],
            ['s', 'contact_person', 255], ['s', 'phone', 50], ['s', 'email', 255], ['s', 'address', 1000],
            ['s', 'bank_details', 1000], ['s', 'tax_info', 1000], ['f', 'performance_rating'],
            ['f', 'total_purchases'], ['b', 'is_active', 1]]
    },
    {
        id: 'buyers', name: 'Buyers', a: [
            ['s', 'company_id', 50, 1], ['s', 'name', 255, 1], ['s', 'type', 50, 1], ['s', 'country', 100],
            ['s', 'registration_number', 100], ['s', 'contact_person', 255], ['s', 'phone', 50], ['s', 'email', 255],
            ['s', 'address', 1000], ['s', 'bank_details', 1000], ['f', 'credit_limit'], ['s', 'payment_terms', 255],
            ['s', 'preferred_currency', 10], ['b', 'is_active', 1]]
    },
    {
        id: 'commodity_categories', name: 'Commodity Categories', a: [
            ['s', 'company_id', 50, 1], ['s', 'name', 255, 1], ['s', 'description', 1000], ['b', 'is_active', 1]]
    },
    {
        id: 'commodity_types', name: 'Commodity Types', a: [
            ['s', 'company_id', 50, 1], ['s', 'category_id', 50, 1], ['s', 'name', 255, 1], ['s', 'code', 50, 1],
            ['s', 'hs_code', 50], ['b', 'export_eligible'], ['s', 'quality_parameters', 5000],
            ['s', 'packaging_types', 5000], ['s', 'standard_unit', 20], ['b', 'is_active', 1]]
    },
    {
        id: 'commodity_batches', name: 'Commodity Batches', a: [
            ['s', 'company_id', 50, 1], ['s', 'batch_number', 100, 1], ['s', 'commodity_type_id', 50, 1],
            ['s', 'supplier_id', 50, 1], ['s', 'purchase_contract_id', 50], ['s', 'location_id', 50, 1],
            ['s', 'crop_year', 10], ['s', 'received_date', 30, 1], ['f', 'received_weight', 1],
            ['f', 'current_weight', 1], ['s', 'grade', 50], ['s', 'status', 30, 1], ['f', 'cost_per_ton', 1],
            ['f', 'total_cost', 1], ['s', 'currency', 10, 1], ['s', 'notes', 2000], ['s', 'created_by', 50]]
    },
    {
        id: 'purchase_contracts', name: 'Purchase Contracts', a: [
            ['s', 'company_id', 50, 1], ['s', 'contract_number', 100, 1], ['s', 'supplier_id', 50, 1],
            ['s', 'commodity_type_id', 50, 1], ['s', 'contract_date', 30, 1], ['s', 'delivery_start_date', 30],
            ['s', 'delivery_end_date', 30], ['f', 'contracted_quantity', 1], ['f', 'delivered_quantity'],
            ['f', 'price_per_ton', 1], ['f', 'total_value', 1], ['s', 'currency', 10, 1],
            ['s', 'payment_terms', 500], ['s', 'quality_specifications', 2000], ['s', 'status', 30, 1],
            ['s', 'created_by', 50]]
    },
    {
        id: 'sales_contracts', name: 'Sales Contracts', a: [
            ['s', 'company_id', 50, 1], ['s', 'contract_number', 100, 1], ['s', 'buyer_id', 50, 1],
            ['s', 'commodity_type_id', 50, 1], ['s', 'contract_date', 30, 1], ['s', 'shipment_period_start', 30],
            ['s', 'shipment_period_end', 30], ['f', 'contracted_quantity', 1], ['f', 'shipped_quantity'],
            ['f', 'price_per_ton', 1], ['f', 'total_value', 1], ['s', 'currency', 10, 1], ['s', 'incoterms', 20],
            ['s', 'destination_port', 255], ['s', 'quality_specifications', 2000], ['s', 'status', 30, 1],
            ['s', 'created_by', 50]]
    },
    {
        id: 'shipments', name: 'Shipments', a: [
            ['s', 'company_id', 50, 1], ['s', 'shipment_number', 100, 1], ['s', 'sales_contract_id', 50, 1],
            ['s', 'buyer_id', 50], ['s', 'vessel_name', 255], ['s', 'container_numbers', 2000],
            ['s', 'loading_port', 255], ['s', 'destination_port', 255], ['s', 'estimated_departure', 30],
            ['s', 'actual_departure', 30], ['s', 'estimated_arrival', 30], ['s', 'actual_arrival', 30],
            ['f', 'total_quantity'], ['f', 'total_value'], ['s', 'currency', 10], ['f', 'freight_cost'],
            ['f', 'insurance_cost'], ['f', 'other_charges'], ['s', 'bill_of_lading', 255],
            ['s', 'status', 30, 1], ['s', 'created_by', 50]]
    },
    {
        id: 'shipment_batches', name: 'Shipment Batches', a: [
            ['s', 'company_id', 50, 1], ['s', 'shipment_id', 50, 1], ['s', 'batch_id', 50, 1], ['f', 'quantity', 1]]
    },
    {
        id: 'processing_orders', name: 'Processing Orders', a: [
            ['s', 'company_id', 50, 1], ['s', 'order_number', 100, 1], ['s', 'processing_type', 50, 1],
            ['s', 'location_id', 50, 1], ['s', 'start_date', 30, 1], ['s', 'end_date', 30],
            ['s', 'input_batches', 5000], ['s', 'output_batches', 5000], ['f', 'input_weight'],
            ['f', 'output_weight'], ['f', 'yield_percentage'], ['s', 'status', 30, 1],
            ['s', 'created_by', 50], ['s', 'notes', 2000]]
    },
    {
        id: 'quality_tests', name: 'Quality Tests', a: [
            ['s', 'company_id', 50, 1], ['s', 'batch_id', 50, 1], ['s', 'test_number', 100, 1],
            ['s', 'test_date', 30, 1], ['f', 'moisture_percentage'], ['f', 'impurity_percentage'],
            ['f', 'aflatoxin_level'], ['f', 'protein_content'], ['f', 'oil_content'],
            ['s', 'other_parameters', 5000], ['s', 'grade_calculated', 50], ['s', 'status', 30, 1],
            ['s', 'tested_by', 100, 1], ['s', 'approved_by', 100], ['s', 'approved_at', 30],
            ['s', 'rejection_reason', 1000], ['s', 'lab_certificate_url', 500]]
    },
    {
        id: 'locations', name: 'Locations', a: [
            ['s', 'company_id', 50, 1], ['s', 'branch_id', 50], ['s', 'name', 255, 1], ['s', 'code', 50, 1],
            ['s', 'type', 50, 1], ['s', 'address', 1000], ['f', 'capacity_tons'], ['s', 'manager_id', 50],
            ['b', 'is_active', 1]]
    },
    {
        id: 'users', name: 'Users', a: [
            ['s', 'company_id', 50, 1], ['s', 'auth_id', 50, 1], ['s', 'email', 255, 1], ['s', 'full_name', 255, 1],
            ['s', 'role', 50, 1], ['s', 'department', 100], ['b', 'is_active', 1]]
    },
    {
        id: 'audit_logs', name: 'Audit Logs', a: [
            ['s', 'company_id', 50, 1], ['s', 'action', 100, 1], ['s', 'details', 2000, 1], ['s', 'user_id', 100, 1],
            ['s', 'user_role', 50, 1], ['s', 'ip_hash', 100]]
    },
    {
        id: 'accounts', name: 'Chart of Accounts', a: [
            ['s', 'company_id', 50, 1], ['s', 'account_code', 50, 1], ['s', 'account_name', 255, 1],
            ['s', 'account_type', 50, 1], ['s', 'account_subtype', 50], ['s', 'parent_account_id', 50],
            ['b', 'is_active', 1], ['f', 'balance']]
    },
    {
        id: 'journal_entries', name: 'Journal Entries', a: [
            ['s', 'company_id', 50, 1], ['s', 'entry_number', 100, 1], ['s', 'entry_date', 30, 1],
            ['s', 'description', 2000], ['s', 'reference_type', 100], ['s', 'reference_id', 100],
            ['f', 'total_debit', 1], ['f', 'total_credit', 1], ['s', 'status', 30, 1],
            ['s', 'created_by', 50], ['s', 'posted_by', 50], ['s', 'posted_at', 30], ['s', 'lines', 10000]]
    },
    {
        id: 'journal_entry_lines', name: 'Journal Entry Lines', a: [
            ['s', 'journal_entry_id', 50, 1], ['s', 'account_id', 50, 1], ['f', 'debit_amount', 1],
            ['f', 'credit_amount', 1], ['s', 'description', 500], ['i', 'line_number', 1]]
    },
    {
        id: 'batch_movements', name: 'Batch Movements', a: [
            ['s', 'company_id', 50, 1], ['s', 'batch_id', 50, 1], ['s', 'movement_type', 50, 1],
            ['s', 'from_location_id', 50], ['s', 'to_location_id', 50], ['f', 'quantity', 1],
            ['s', 'movement_date', 30, 1], ['s', 'reference_number', 100], ['s', 'performed_by', 100, 1],
            ['s', 'notes', 2000]]
    },
    {
        id: 'documents', name: 'Documents', a: [
            ['s', 'company_id', 50, 1], ['s', 'reference_type', 50, 1], ['s', 'reference_id', 50, 1],
            ['s', 'document_type', 50, 1], ['s', 'file_name', 500, 1], ['s', 'file_path', 1000, 1],
            ['i', 'file_size'], ['s', 'mime_type', 100], ['i', 'version'], ['s', 'uploaded_by', 100, 1]]
    },
    {
        id: 'exchange_rates', name: 'Exchange Rates', a: [
            ['s', 'company_id', 50, 1], ['s', 'from_currency', 10, 1], ['s', 'to_currency', 10, 1],
            ['f', 'rate', 1], ['s', 'rate_date', 30, 1], ['s', 'source', 50, 1], ['b', 'is_active']]
    },
    {
        id: 'compliance_records', name: 'Compliance Records', a: [
            ['s', 'company_id', 50, 1], ['s', 'shipment_id', 50, 1], ['s', 'nepc_registration', 255],
            ['s', 'nxp_form_number', 255], ['s', 'phytosanitary_certificate', 255],
            ['s', 'certificate_of_origin', 255], ['s', 'export_permit', 255], ['b', 'ness_fee_paid'],
            ['f', 'ness_amount'], ['s', 'cci_number', 255], ['f', 'vat_rate'], ['f', 'withholding_tax_rate'],
            ['s', 'compliance_status', 30, 1], ['s', 'verified_by', 100], ['s', 'verified_at', 30]]
    },
    {
        id: 'trade_finance', name: 'Trade Finance', a: [
            ['s', 'company_id', 50, 1], ['s', 'lc_number', 100, 1], ['s', 'sales_contract_id', 50, 1],
            ['s', 'buyer_id', 50, 1], ['s', 'issuing_bank', 255, 1], ['s', 'advising_bank', 255],
            ['f', 'amount', 1], ['s', 'currency', 10, 1], ['s', 'issue_date', 30, 1],
            ['s', 'expiry_date', 30, 1], ['s', 'status', 30, 1]]
    },
    {
        id: 'goods_receipts', name: 'Goods Receipts', a: [
            ['s', 'company_id', 50, 1], ['s', 'receipt_number', 100, 1], ['s', 'purchase_contract_id', 50, 1],
            ['s', 'batch_id', 50], ['s', 'received_date', 30, 1], ['f', 'received_quantity', 1],
            ['s', 'received_by', 100, 1], ['s', 'notes', 2000]]
    },
];

// ──── MAIN ────
async function main() {
    console.log('\n🚀  Appwrite DB Setup — Creating 23 collections...\n');

    let created = 0, skipped = 0, failed = 0;

    for (const col of COLS) {
        const ok = await createCollection(col.id, col.name);
        if (!ok) { failed++; continue; }

        let attrOk = 0, attrFail = 0;
        for (const attr of col.a) {
            const [type, key, ...rest] = attr;
            let res;
            switch (type) {
                case 's': res = await addString(col.id, key, rest[0] || 255, !!rest[1]); break;
                case 'f': res = await addFloat(col.id, key, !!rest[0]); break;
                case 'i': res = await addInteger(col.id, key, !!rest[0]); break;
                case 'b': res = await addBoolean(col.id, key, !!rest[0]); break;
            }
            if (res === 'FAIL') attrFail++;
            else attrOk++;
            await sleep(800); // 800ms between each attribute to avoid rate limits
        }

        if (attrFail > 0) console.log(`    📋  ${attrOk}/${col.a.length} attributes (${attrFail} failed)`);
        else console.log(`    📋  ${attrOk} attributes ✓`);

        created++;
        await sleep(1500); // 1.5s pause between collections
    }

    console.log(`\n── Summary ──`);
    console.log(`   Collections OK: ${created}`);
    if (failed > 0) console.log(`   Collections FAILED: ${failed} — re-run script to retry`);
    console.log(`\n✅  Done! Re-run is safe (skips existing items).\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
