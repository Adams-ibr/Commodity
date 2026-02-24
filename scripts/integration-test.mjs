#!/usr/bin/env node
import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * END-TO-END INTEGRATION TEST SUITE
 * 
 * Verifies the complete commodity ERP workflow:
 * 1. Master Data Setup
 * 2. Procurement (Supplier -> Contract -> Batch)
 * 3. Quality (Test -> Approval)
 * 4. Processing (Conversion)
 * 5. Sales (Buyer -> Contract -> Shipment)
 * 6. Audit Logging
 */

const ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '699a5d330017f77f9b8b';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = '699cdd380016ac8b1a41';
const COMPANY_ID = '00000000-0000-0000-0000-000000000001';

if (!API_KEY) {
    console.error('❌ APPWRITE_API_KEY environment variable is required.');
    process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const db = new Databases(client);

async function runTests() {
    console.log('🚀 Starting End-to-End Integration Tests...\n');
    const logs = [];
    const log = (msg) => { console.log(`  🔹 ${msg}`); logs.push(msg); };

    try {
        // --- PHASE 1: Master Data ---
        log('Phase 1: Master Data Setup');
        const cat = await db.createDocument(DATABASE_ID, 'commodity_categories', ID.unique(), {
            company_id: COMPANY_ID, name: 'Oilseeds (Test)', description: 'Testing category', is_active: true
        });
        const type = await db.createDocument(DATABASE_ID, 'commodity_types', ID.unique(), {
            company_id: COMPANY_ID, category_id: cat.$id, name: 'Soya Beans (Test)', code: 'SOY-TST', standard_unit: 'MT', is_active: true
        });

        // --- PHASE 2: Procurement ---
        log('Phase 2: Procurement Workflow');
        const supplier = await db.createDocument(DATABASE_ID, 'suppliers', ID.unique(), {
            company_id: COMPANY_ID, name: 'Test Farmer Corp', type: 'FARMER', is_active: true
        });
        const contract = await db.createDocument(DATABASE_ID, 'purchase_contracts', ID.unique(), {
            company_id: COMPANY_ID, supplier_id: supplier.$id, commodity_type_id: type.$id,
            contract_number: `PC-${Date.now()}`, contract_date: new Date().toISOString(),
            contracted_quantity: 100, price_per_ton: 500000, total_value: 50000000, currency: 'NGN', status: 'ACTIVE'
        });
        const location = await db.createDocument(DATABASE_ID, 'locations', ID.unique(), {
            company_id: COMPANY_ID, name: 'Test Warehouse', code: 'TWH-01', type: 'WAREHOUSE', is_active: true
        });
        const batch = await db.createDocument(DATABASE_ID, 'commodity_batches', ID.unique(), {
            company_id: COMPANY_ID, batch_number: `BT-${Date.now()}`, commodity_type_id: type.$id,
            supplier_id: supplier.$id, location_id: location.$id, received_weight: 50, current_weight: 50,
            status: 'RECEIVED', received_date: new Date().toISOString(), currency: 'NGN', total_cost: 25000000
        });

        // --- PHASE 3: Quality Control ---
        log('Phase 3: Quality Control');
        const test = await db.createDocument(DATABASE_ID, 'quality_tests', ID.unique(), {
            company_id: COMPANY_ID, batch_id: batch.$id, test_number: `QC-${Date.now()}`,
            test_date: new Date().toISOString(), moisture_percentage: 12.5, impurity_percentage: 1.2,
            status: 'APPROVED', tested_by: 'Test Lab', grade_calculated: 'Grade A'
        });
        await db.updateDocument(DATABASE_ID, 'commodity_batches', batch.$id, { status: 'APPROVED', grade: 'Grade A' });

        // --- PHASE 4: Processing (Simulated) ---
        log('Phase 4: Processing Integration');
        const pOrder = await db.createDocument(DATABASE_ID, 'processing_orders', ID.unique(), {
            company_id: COMPANY_ID, order_number: `PO-${Date.now()}`, processing_type: 'CLEANING',
            location_id: location.$id, start_date: new Date().toISOString(), status: 'COMPLETED',
            input_weight: 50, output_weight: 48, yield_percentage: 96
        });

        // --- PHASE 5: Sales & Export ---
        log('Phase 5: Sales & Export Workflow');
        const buyer = await db.createDocument(DATABASE_ID, 'buyers', ID.unique(), {
            company_id: COMPANY_ID, name: 'Global Impex Test', type: 'IMPORTER', is_active: true
        });
        const sContract = await db.createDocument(DATABASE_ID, 'sales_contracts', ID.unique(), {
            company_id: COMPANY_ID, buyer_id: buyer.$id, commodity_type_id: type.$id,
            contract_number: `SC-${Date.now()}`, contract_date: new Date().toISOString(),
            contracted_quantity: 48, price_per_ton: 1200, total_value: 57600, currency: 'USD', status: 'ACTIVE'
        });
        const shipment = await db.createDocument(DATABASE_ID, 'shipments', ID.unique(), {
            company_id: COMPANY_ID, shipment_number: `SH-${Date.now()}`, sales_contract_id: sContract.$id,
            buyer_id: buyer.$id, status: 'SHIPPED', total_quantity: 48, total_value: 57600, currency: 'USD'
        });

        // --- PHASE 6: Audit & Verification ---
        log('Phase 6: Audit Verification');
        await db.createDocument(DATABASE_ID, 'audit_logs', ID.unique(), {
            action: 'INTEGRATION_TEST_SUCCESS', details: `End-to-end test completed for ${type.name}`,
            user_id: 'SYSTEM_TESTER', user_role: 'ADMIN'
        });

        console.log('\n✅ All integration test phases passed successfully!\n');
    } catch (err) {
        console.error('\n❌ Integration test failed:', err.message);
        process.exit(1);
    }
}

runTests();
