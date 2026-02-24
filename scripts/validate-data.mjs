#!/usr/bin/env node
// =====================================================
// DATA INTEGRITY VALIDATION SCRIPT
// =====================================================
// Checks all Appwrite collections for:
//   1. Documents missing company_id
//   2. Referential integrity (buyer/supplier references)
//   3. Duplicate batch/contract numbers
// =====================================================

import { Client, Databases, Query } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DB = process.env.VITE_APPWRITE_DATABASE_ID || '';

// Collection IDs — mirror appwriteConfig.ts
const COLLECTIONS = {
    COMMODITY_CATEGORIES: 'commodity_categories',
    COMMODITY_TYPES: 'commodity_types',
    SUPPLIERS: 'suppliers',
    PURCHASE_CONTRACTS: 'purchase_contracts',
    COMMODITY_BATCHES: 'commodity_batches',
    BATCH_MOVEMENTS: 'batch_movements',
    QUALITY_TESTS: 'quality_tests',
    PROCESSING_ORDERS: 'processing_orders',
    BUYERS: 'buyers',
    SALES_CONTRACTS: 'sales_contracts',
    SHIPMENTS: 'shipments',
    LETTERS_OF_CREDIT: 'letters_of_credit',
    DOCUMENTS: 'documents',
    JOURNAL_ENTRIES: 'journal_entries',
    CHART_OF_ACCOUNTS: 'chart_of_accounts',
    EXCHANGE_RATES: 'exchange_rates',
    AUDIT_LOGS: 'audit_logs',
    LOCATIONS: 'locations',
    USERS: 'users',
};

let passed = 0;
let warnings = 0;
let errors = 0;

function ok(msg) { passed++; console.log(`  ✅ ${msg}`); }
function warn(msg) { warnings++; console.log(`  ⚠️  ${msg}`); }
function fail(msg) { errors++; console.log(`  ❌ ${msg}`); }

async function listAll(collectionId) {
    try {
        const res = await databases.listDocuments(DB, collectionId, [Query.limit(500)]);
        return res.documents;
    } catch (err) {
        return null; // collection may not exist yet
    }
}

// ─── Check 1: Missing company_id ───────────────────────────────────────────
async function checkCompanyIds() {
    console.log('\n🔍 Check 1: Documents missing company_id');
    const collectionsToCheck = [
        'COMMODITY_CATEGORIES', 'COMMODITY_TYPES', 'SUPPLIERS', 'PURCHASE_CONTRACTS',
        'COMMODITY_BATCHES', 'BATCH_MOVEMENTS', 'QUALITY_TESTS', 'PROCESSING_ORDERS',
        'BUYERS', 'SALES_CONTRACTS', 'SHIPMENTS', 'LETTERS_OF_CREDIT',
        'DOCUMENTS', 'JOURNAL_ENTRIES', 'AUDIT_LOGS'
    ];

    for (const name of collectionsToCheck) {
        const docs = await listAll(COLLECTIONS[name]);
        if (docs === null) { warn(`Collection ${name} not found — skipped`); continue; }
        const missing = docs.filter(d => !d.company_id);
        if (missing.length > 0) {
            fail(`${name}: ${missing.length}/${docs.length} docs missing company_id`);
        } else {
            ok(`${name}: all ${docs.length} docs have company_id`);
        }
    }
}

// ─── Check 2: Referential Integrity ────────────────────────────────────────
async function checkReferentialIntegrity() {
    console.log('\n🔍 Check 2: Referential integrity');

    const buyers = await listAll(COLLECTIONS.BUYERS);
    const suppliers = await listAll(COLLECTIONS.SUPPLIERS);
    const contracts = await listAll(COLLECTIONS.SALES_CONTRACTS);
    const batches = await listAll(COLLECTIONS.COMMODITY_BATCHES);

    // Sales contracts → Buyers
    if (contracts && buyers) {
        const buyerIds = new Set(buyers.map(b => b.$id));
        const orphaned = contracts.filter(c => c.buyer_id && !buyerIds.has(c.buyer_id));
        if (orphaned.length > 0) {
            fail(`SALES_CONTRACTS: ${orphaned.length} contracts reference non-existent buyer IDs`);
        } else {
            ok(`SALES_CONTRACTS → BUYERS: all references valid (${contracts.length} checked)`);
        }
    } else {
        warn('Skipped sales→buyers check (collections not found)');
    }

    // Batches → Suppliers
    if (batches && suppliers) {
        const supplierIds = new Set(suppliers.map(s => s.$id));
        const orphaned = batches.filter(b => b.supplier_id && !supplierIds.has(b.supplier_id));
        if (orphaned.length > 0) {
            fail(`COMMODITY_BATCHES: ${orphaned.length} batches reference non-existent supplier IDs`);
        } else {
            ok(`COMMODITY_BATCHES → SUPPLIERS: all references valid (${batches.length} checked)`);
        }
    } else {
        warn('Skipped batches→suppliers check (collections not found)');
    }
}

// ─── Check 3: Duplicate Numbers ───────────────────────────────────────────
async function checkDuplicates() {
    console.log('\n🔍 Check 3: Duplicate batch/contract numbers');

    const batches = await listAll(COLLECTIONS.COMMODITY_BATCHES);
    if (batches) {
        const nums = batches.map(b => b.batch_number).filter(Boolean);
        const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
        if (dupes.length > 0) {
            fail(`COMMODITY_BATCHES: duplicate batch numbers found: ${[...new Set(dupes)].join(', ')}`);
        } else {
            ok(`COMMODITY_BATCHES: no duplicate batch numbers (${nums.length} checked)`);
        }
    }

    const contracts = await listAll(COLLECTIONS.SALES_CONTRACTS);
    if (contracts) {
        const nums = contracts.map(c => c.contract_number).filter(Boolean);
        const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
        if (dupes.length > 0) {
            fail(`SALES_CONTRACTS: duplicate contract numbers found: ${[...new Set(dupes)].join(', ')}`);
        } else {
            ok(`SALES_CONTRACTS: no duplicate contract numbers (${nums.length} checked)`);
        }
    }
}

// ─── Run All ───────────────────────────────────────────────────────────────
async function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║       GALALTIX COMMODITIES — DATA VALIDATOR     ║');
    console.log('╚══════════════════════════════════════════════════╝');

    if (!DB) {
        console.error('❌ VITE_APPWRITE_DATABASE_ID not set in .env');
        process.exit(1);
    }

    await checkCompanyIds();
    await checkReferentialIntegrity();
    await checkDuplicates();

    console.log('\n══════════════════════════════════════════════════');
    console.log(`  Results: ${passed} passed, ${warnings} warnings, ${errors} errors`);
    console.log('══════════════════════════════════════════════════\n');

    process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
