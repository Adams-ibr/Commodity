/**
 * Generate Sample Excel Upload Files for Galaltix Commodity ERP
 * 
 * Creates 6 sample .xlsx files in the /samples directory:
 *   1. sample_commodity_batches.xlsx
 *   2. sample_purchase_contracts.xlsx
 *   3. sample_sales_contracts.xlsx
 *   4. sample_suppliers.xlsx
 *   5. sample_buyers.xlsx
 *   6. sample_advanced_workbook.xlsx (multi-sheet for AdvancedIngestionEngine)
 *
 * Usage: node scripts/generate_samples.cjs
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'samples');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeSheet(fileName, sheetName, headers, rows) {
    const wb = XLSX.utils.book_new();
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-size columns
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const filePath = path.join(OUTPUT_DIR, fileName);
    XLSX.writeFile(wb, filePath);
    console.log(`  ✅ ${fileName}`);
}

function writeMultiSheetWorkbook(fileName, sheets) {
    const wb = XLSX.utils.book_new();
    for (const { name, headers, rows } of sheets) {
        const data = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 4, 18) }));
        XLSX.utils.book_append_sheet(wb, ws, name);
    }
    const filePath = path.join(OUTPUT_DIR, fileName);
    XLSX.writeFile(wb, filePath);
    console.log(`  ✅ ${fileName}`);
}

// ── 1. Commodity Batches ──
// Column aliases from ingestionService schema
writeSheet('sample_commodity_batches.xlsx', 'Commodity Batches', [
    'Batch #', 'Category', 'Commodity', 'Supplier Name', 'Contract #',
    'Warehouse', 'Date', 'Weight', 'Current Qty', 'Price',
    'Currency', 'Truck', 'Driver', 'Quality', 'Remarks'
], [
    ['BATCH-001', 'Oilseeds', 'Sesame Seeds', 'Adamu Farms', 'PC-2026-001', 'Lagos Warehouse', '2026-01-15', 25.5, 25.5, 450000, 'NGN', 'LG-1234-AB', 'Musa Ibrahim', 'Grade A', 'Clean lot, no foreign matter'],
    ['BATCH-002', 'Oilseeds', 'Sesame Seeds', 'Kwara Cooperative', 'PC-2026-001', 'Lagos Warehouse', '2026-01-18', 30.0, 28.5, 455000, 'NGN', 'LG-5678-CD', 'Abubakar Sani', 'Grade A', 'Minor impurities noted'],
    ['BATCH-003', 'Nuts', 'Cashew Nuts', 'Ogun Agri Ltd', 'PC-2026-002', 'Ogun Processing Plant', '2026-02-01', 18.0, 18.0, 1200000, 'NGN', 'OG-9012-EF', 'Chidi Okafor', 'Grade B', 'Good moisture level'],
    ['BATCH-004', 'Nuts', 'Cashew Nuts', 'Ogun Agri Ltd', 'PC-2026-002', 'Ogun Processing Plant', '2026-02-05', 22.0, 20.0, 1180000, 'NGN', 'OG-3456-GH', 'Emeka Nwankwo', 'Grade A', 'Premium quality cashew'],
    ['BATCH-005', 'Legumes', 'Soya Beans', 'Benue Farmers Union', 'PC-2026-003', 'Abuja Distribution Center', '2026-02-10', 40.0, 40.0, 320000, 'NGN', 'AB-7890-IJ', 'Yakubu Danladi', 'Grade A', 'Freshly harvested'],
]);

// ── 2. Purchase Contracts ──
writeSheet('sample_purchase_contracts.xlsx', 'Purchase Contracts', [
    'Contract #', 'Supplier Name', 'Commodity', 'Date', 'Qty',
    'Price', 'Total Cost', 'Currency', 'Status', 'Remarks'
], [
    ['PC-2026-001', 'Adamu Farms', 'Sesame Seeds', '2026-01-10', 100, 450000, 45000000, 'NGN', 'ACTIVE', 'Season 1 contract'],
    ['PC-2026-002', 'Ogun Agri Ltd', 'Cashew Nuts', '2026-01-20', 80, 1200000, 96000000, 'NGN', 'ACTIVE', 'Premium cashew agreement'],
    ['PC-2026-003', 'Benue Farmers Union', 'Soya Beans', '2026-02-01', 200, 320000, 64000000, 'NGN', 'ACTIVE', 'Large volume contract'],
    ['PC-2026-004', 'Kwara Cooperative', 'Sesame Seeds', '2026-02-15', 50, 460000, 23000000, 'NGN', 'DRAFT', 'Pending final sign-off'],
    ['PC-2026-005', 'Delta Produce Co', 'Shea Nuts', '2026-03-01', 60, 380000, 22800000, 'NGN', 'DRAFT', 'New supplier trial'],
]);

// ── 3. Sales Contracts ──
writeSheet('sample_sales_contracts.xlsx', 'Sales Contracts', [
    'Contract #', 'Customer', 'Commodity', 'Date', 'Qty',
    'Rate', 'Currency', 'Status'
], [
    ['SC-2026-001', 'Euro Commodities GmbH', 'Sesame Seeds', '2026-01-25', 80, 1400, 'USD', 'ACTIVE'],
    ['SC-2026-002', 'Asian Trade Corp', 'Cashew Nuts', '2026-02-10', 60, 3200, 'USD', 'ACTIVE'],
    ['SC-2026-003', 'West India Imports', 'Sesame Seeds', '2026-02-20', 50, 1380, 'USD', 'DRAFT'],
    ['SC-2026-004', 'Global Foods Inc', 'Soya Beans', '2026-03-05', 150, 620, 'USD', 'ACTIVE'],
    ['SC-2026-005', 'Nordic Trading AB', 'Shea Nuts', '2026-03-15', 40, 950, 'EUR', 'DRAFT'],
]);

// ── 4. Suppliers/Farmers ──
writeSheet('sample_suppliers.xlsx', 'Suppliers', [
    'Supplier Name', 'Type', 'Email', 'Phone', 'RC Number', 'Contact Person'
], [
    ['Adamu Farms', 'FARMER', 'adamu@farms.ng', '+234 801 234 5678', 'RC-100001', 'Adamu Yusuf'],
    ['Kwara Cooperative', 'COOPERATIVE', 'info@kwaracoop.ng', '+234 802 345 6789', 'RC-200002', 'Fatima Abdullahi'],
    ['Ogun Agri Ltd', 'AGGREGATOR', 'procurement@ogunagri.com', '+234 803 456 7890', 'RC-300003', 'Bola Adeyemi'],
    ['Benue Farmers Union', 'COOPERATIVE', 'contact@benuefarmers.org', '+234 804 567 8901', 'RC-400004', 'Terhemba Atorough'],
    ['Delta Produce Co', 'AGGREGATOR', 'sales@deltaproduce.ng', '+234 805 678 9012', 'RC-500005', 'Oghenekaro Efemena'],
]);

// ── 5. Buyers/Customers ──
writeSheet('sample_buyers.xlsx', 'Buyers', [
    'Buyer Name', 'Type', 'Country', 'Email', 'Phone', 'Currency'
], [
    ['Euro Commodities GmbH', 'IMPORTER', 'Germany', 'info@eurocommodities.de', '+49 30 123 4567', 'EUR'],
    ['Asian Trade Corp', 'DISTRIBUTOR', 'Vietnam', 'trade@asiantradecorp.vn', '+84 28 1234 5678', 'USD'],
    ['West India Imports', 'IMPORTER', 'India', 'purchase@westindiaimports.in', '+91 22 4567 8901', 'USD'],
    ['Global Foods Inc', 'PROCESSOR', 'United States', 'sourcing@globalfoods.com', '+1 212 345 6789', 'USD'],
    ['Nordic Trading AB', 'IMPORTER', 'Sweden', 'info@nordictrading.se', '+46 8 123 4567', 'EUR'],
]);

// ── 6. Advanced Multi-Sheet Workbook ──
writeMultiSheetWorkbook('sample_advanced_workbook.xlsx', [
    {
        name: 'Sales Contracts',
        headers: ['Contract Number', 'Buyer', 'Commodity', 'Contract Date', 'Quantity', 'Price', 'Currency', 'Status'],
        rows: [
            ['SC-ADV-001', 'Euro Commodities GmbH', 'Sesame Seeds', '2026-01-20', 100, 1400, 'USD', 'ACTIVE'],
            ['SC-ADV-002', 'Asian Trade Corp', 'Cashew Nuts', '2026-02-05', 60, 3200, 'USD', 'ACTIVE'],
            ['SC-ADV-003', 'Global Foods Inc', 'Soya Beans', '2026-03-01', 120, 620, 'USD', 'ACTIVE'],
        ]
    },
    {
        name: 'Procurement',
        headers: ['Contract Number', 'Supplier', 'Commodity', 'Date', 'Received Weight', 'Price', 'Currency'],
        rows: [
            ['PC-ADV-001', 'Adamu Farms', 'Sesame Seeds', '2026-01-10', 50, 450000, 'NGN'],
            ['PC-ADV-002', 'Ogun Agri Ltd', 'Cashew Nuts', '2026-01-25', 30, 1200000, 'NGN'],
            ['PC-ADV-003', 'Benue Farmers Union', 'Soya Beans', '2026-02-15', 80, 320000, 'NGN'],
        ]
    },
    {
        name: 'Processing',
        headers: ['Order Number', 'Location', 'Date', 'Type', 'Total Cost', 'Remarks'],
        rows: [
            ['PROC-001', 'Ogun Processing Plant', '2026-02-01', 'CLEANING', 500000, 'Standard cleaning process'],
            ['PROC-002', 'Ogun Processing Plant', '2026-02-10', 'SORTING', 350000, 'Grade separation sorting'],
            ['PROC-003', 'Lagos Warehouse', '2026-02-20', 'CLEANING', 450000, 'Sesame seed cleaning'],
        ]
    },
    {
        name: 'Trucking',
        headers: ['Batch Number', 'Truck Number', 'Driver', 'Driver Phone', 'Quantity', 'Date'],
        rows: [
            ['BATCH-ADV-001', 'LG-1234-AB', 'Musa Ibrahim', '+234 801 111 2222', 25, '2026-02-05'],
            ['BATCH-ADV-002', 'OG-5678-CD', 'Abubakar Sani', '+234 802 333 4444', 30, '2026-02-12'],
            ['BATCH-ADV-003', 'AB-9012-EF', 'Chidi Okafor', '+234 803 555 6666', 40, '2026-02-18'],
        ]
    },
    {
        name: 'Stuffing',
        headers: ['Container Number', 'Batch Number', 'Bags', 'Booking Ref', 'Date'],
        rows: [
            ['MSKU1234567', 'BATCH-ADV-001', 800, 'BKG-2026-001', '2026-03-01'],
            ['TCLU7654321', 'BATCH-ADV-002', 650, 'BKG-2026-001', '2026-03-02'],
            ['MSKU9876543', 'BATCH-ADV-003', 1200, 'BKG-2026-002', '2026-03-05'],
        ]
    },
    {
        name: 'Delivery (Shipments)',
        headers: ['Shipment Number', 'Contract Number', 'Vessel', 'Booking Ref', 'Loading Port', 'Destination Port', 'Departure Date'],
        rows: [
            ['SHIP-001', 'SC-ADV-001', 'MV Lagos Star', 'BKG-2026-001', 'Apapa Port Lagos', 'Hamburg Port', '2026-03-10'],
            ['SHIP-002', 'SC-ADV-002', 'MV West Africa', 'BKG-2026-002', 'Tin Can Island Lagos', 'Ho Chi Minh Port', '2026-03-15'],
            ['SHIP-003', 'SC-ADV-003', 'MV Atlantic Dawn', 'BKG-2026-003', 'Apapa Port Lagos', 'New York Port', '2026-03-20'],
        ]
    },
    {
        name: 'Compliance',
        headers: ['Booking Ref', 'NXP Form', 'NEPC Registration', 'Date'],
        rows: [
            ['BKG-2026-001', 'NXP/2026/LOS/00123', 'NEPC-REG-001', '2026-03-05'],
            ['BKG-2026-002', 'NXP/2026/LOS/00124', 'NEPC-REG-002', '2026-03-08'],
            ['BKG-2026-003', 'NXP/2026/LOS/00125', 'NEPC-REG-003', '2026-03-12'],
        ]
    },
    {
        name: 'FX Rates',
        headers: ['From Currency', 'To Currency', 'Exchange Rate', 'Date', 'Source'],
        rows: [
            ['USD', 'NGN', 1580.50, '2026-01-15', 'CBN'],
            ['EUR', 'NGN', 1720.25, '2026-01-15', 'CBN'],
            ['USD', 'NGN', 1595.00, '2026-02-01', 'PARALLEL'],
        ]
    }
]);

console.log(`\n🎉 All sample files generated in: ${OUTPUT_DIR}`);
console.log(`   Total files: 6`);
