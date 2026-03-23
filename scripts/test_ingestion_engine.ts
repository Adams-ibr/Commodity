import * as XLSX from 'xlsx';
import * as supabaseDb from '../services/supabaseDb';

// Manually mock the database functions
(supabaseDb as any).dbCreate = async (table: string, data: any) => {
    console.log(`[MOCK DB] CREATE in ${table}:`, JSON.stringify(data).substring(0, 100) + '...');
    return { data: { id: `mock-id-${table}-${Math.random()}` }, error: null };
};
(supabaseDb as any).dbCreateBulk = async (table: string, data: any[]) => {
    console.log(`[MOCK DB] CREATE BULK in ${table} (${data.length} records)`);
    return { data: data.map((d, i) => ({ id: `mock-id-${i}` })), error: null };
};
(supabaseDb as any).dbList = async (table: string) => {
    console.log(`[MOCK DB] LIST ${table}`);
    return { data: [], error: null };
};

import { advancedIngestionService } from '../services/advancedIngestionService';

async function runTest() {
    console.log('--- Starting Ingestion Engine Test ---');

    // 1. Create a mock workbook
    const wb = XLSX.utils.book_new();

    // Sheet: Contracts
    const contractsData = [
        ['Contract Title Row (To be ignored)'],
        ['Date', 'Contract #', 'Buyer', 'Commodity', 'Qty', 'Price'],
        ['2023-10-01', 'SC-001', 'Global Traders', 'Soybeans', 500, 450],
        ['2023-10-02', 'SC-002', 'Eco Corp', 'Maize', 300, 380]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(contractsData), 'Contracts');

    // Sheet: Stuffing
    const stuffingData = [
        ['Stuffing Report'],
        ['Date', 'Container #', 'Batch #', 'Bags', 'Booking Ref'],
        ['2023-10-15', 'CONT-123', 'BATCH-001', 400, 'BK-888'],
        ['2023-10-16', 'CONT-456', 'BATCH-002', 350, 'BK-999']
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stuffingData), 'Stuffing');

    // 2. Process Workbook
    const result = await advancedIngestionService.processWorkbook(wb);

    console.log('\n--- FINAL INGESTION RESULT ---');
    console.log(JSON.stringify(result, null, 2));

    if (result.errors.length > 0) {
        console.log('\nNote: Errors occurred (expected if batches/contracts are missing in mock cache).');
    } else {
        console.log('\nTest completed successfully.');
    }
}

runTest().catch(console.error);
