#!/usr/bin/env node
import { Client, Databases, ID, Query } from 'node-appwrite';

/**
 * LEGACY PETROLEUM DATA MIGRATION UTILITY
 * 
 * Migrates data from the old petroleum structure (schema.sql) 
 * to the new commodity ERP collections (Appwrite).
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

// Mock Legacy Data (representing data from the old schema.sql)
const legacyData = {
    customers: [
        { id: 'l1', name: 'West Africa Power', type: 'End User', phone: '+234-111', email: 'info@wap.co', address: 'Lagos, Nigeria' },
        { id: 'l2', name: 'Global Logistics Ltd', type: 'Dealer', phone: '+234-222', email: 'sales@gl.co', address: 'Kano, Nigeria' }
    ],
    inventory: [
        { id: 'i1', product: 'LPG', current_volume: 500.5, location: 'Apapa Depot', status: 'Normal' },
        { id: 'i2', product: 'AGO', current_volume: 250.0, location: 'Kano Storage', status: 'Normal' }
    ],
    transactions: [
        { id: 't1', type: 'SALE', product: 'LPG', volume: 50.0, customer_name: 'West Africa Power', reference_doc: 'INV-PET-001', total_amount: 1500000 }
    ]
};

async function migrate() {
    console.log('🚀 Starting Petroleum to Commodity Migration...\n');

    try {
        // 1. Migrate Categories & Types (Base Setup)
        console.log('📦 Setting up basic commodity mapping...');

        // Ensure Grains category exists (represented by oilseeds for legacy mapping if applicable, but we'll use "Petroleum Products")
        const catRes = await db.createDocument(DATABASE_ID, 'commodity_categories', ID.unique(), {
            company_id: COMPANY_ID,
            name: 'Petroleum Products',
            description: 'Legacy petroleum and gas products',
            is_active: true
        });
        const categoryId = catRes.$id;

        const typesMap = new Map();
        for (const item of legacyData.inventory) {
            if (!typesMap.has(item.product)) {
                const typeRes = await db.createDocument(DATABASE_ID, 'commodity_types', ID.unique(), {
                    company_id: COMPANY_ID,
                    category_id: categoryId,
                    name: item.product,
                    code: item.product.toUpperCase(),
                    is_active: true,
                    standard_unit: 'MT'
                });
                typesMap.set(item.product, typeRes.$id);
            }
        }

        // 2. Migrate Customers to Buyers
        console.log('👥 Migrating customers to Buyers...');
        for (const cust of legacyData.customers) {
            await db.createDocument(DATABASE_ID, 'buyers', ID.unique(), {
                company_id: COMPANY_ID,
                name: cust.name,
                type: cust.type === 'Dealer' ? 'DISTRIBUTOR' : 'IMPORTER',
                email: cust.email,
                phone: cust.phone,
                address: JSON.stringify({ raw: cust.address }),
                is_active: true,
                preferred_currency: 'NGN'
            });
        }

        // 3. Migrate Inventory to Commodity Batches
        console.log('🚛 Migrating inventory to Commodity Batches...');
        for (const inv of legacyData.inventory) {
            // First find/create location
            const locRes = await db.listDocuments(DATABASE_ID, 'locations', [Query.equal('name', inv.location)]);
            let locationId;
            if (locRes.total === 0) {
                const newLoc = await db.createDocument(DATABASE_ID, 'locations', ID.unique(), {
                    company_id: COMPANY_ID,
                    name: inv.location,
                    code: inv.location.substring(0, 3).toUpperCase(),
                    type: 'WAREHOUSE',
                    is_active: true
                });
                locationId = newLoc.$id;
            } else {
                locationId = locRes.documents[0].$id;
            }

            await db.createDocument(DATABASE_ID, 'commodity_batches', ID.unique(), {
                company_id: COMPANY_ID,
                batch_number: `MIG-${inv.product}-${Date.now()}`,
                commodity_type_id: typesMap.get(inv.product),
                location_id: locationId,
                received_weight: inv.current_volume,
                current_weight: inv.current_volume,
                status: 'RECEIVED',
                received_date: new Date().toISOString(),
                currency: 'NGN',
                total_cost: 0 // Legacy data didn't have cost in this view
            });
        }

        console.log('\n✅ Migration complete!');
    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
    }
}

migrate();
