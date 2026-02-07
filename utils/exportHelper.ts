import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reconciliation, Transaction, InventoryItem, ProductType } from '../types';

interface DailyReportData {
    date: string;
    reconciliations: Reconciliation[];
    sales: Transaction[];
    receipts: Transaction[];
    transfers: Transaction[];
    inventorySnapshot: InventoryItem[]; // Current state
}

const formatCurrency = (amount: number) => `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
const formatVolume = (vol: number) => `${vol.toLocaleString()} L`;

export const exportToCSV = (data: DailyReportData) => {
    // Flatten data for CSV - mainly focus on Reconciliation as it's the core
    const headers = ['Date', 'Location', 'Product', 'Opening (L)', 'Expected (L)', 'Actual (L)', 'Variance (L)', 'Variance %', 'Status', 'Notes'];
    const rows = data.reconciliations.map(r => [
        r.date,
        r.location,
        r.product,
        r.openingVolume,
        r.expectedVolume,
        r.actualVolume,
        r.variance,
        r.variancePercent.toFixed(2) + '%',
        r.status,
        r.notes || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reconciliation_Report_${data.date}.csv`;
    link.click();
};

export const exportToExcel = (data: DailyReportData) => {
    const workbook = utils.book_new();

    // 1. Reconciliation Sheet
    const reconData = data.reconciliations.map(r => ({
        Date: r.date,
        Location: r.location,
        Product: r.product,
        'Opening (L)': r.openingVolume,
        'Expected (L)': r.expectedVolume,
        'Actual (L)': r.actualVolume,
        'Variance (L)': r.variance,
        'Variance %': r.variancePercent,
        Status: r.status,
        Notes: r.notes
    }));
    const reconSheet = utils.json_to_sheet(reconData);
    utils.book_append_sheet(workbook, reconSheet, 'Inventory Reconciliation');

    // 2. Sales Summary Sheet
    // Aggregate sales by Product
    const salesByProduct: Record<string, { volume: number, amount: number, count: number }> = {};
    data.sales.forEach(tx => {
        if (!salesByProduct[tx.product]) {
            salesByProduct[tx.product] = { volume: 0, amount: 0, count: 0 };
        }
        salesByProduct[tx.product].volume += tx.volume;
        salesByProduct[tx.product].amount += (tx.totalAmount || 0);
        salesByProduct[tx.product].count += 1;
    });

    const salesSheetData = Object.entries(salesByProduct).map(([product, stats]) => ({
        Product: product,
        'Total Volume Sold (L)': stats.volume,
        'Total Revenue (₦)': stats.amount,
        'Transaction Count': stats.count
    }));
    const salesSheet = utils.json_to_sheet(salesSheetData);
    utils.book_append_sheet(workbook, salesSheet, 'Sales Summary');

    // 3. Transactions Detail Sheet
    const txData = [...data.sales, ...data.receipts, ...data.transfers].map(tx => ({
        Time: new Date(tx.timestamp).toLocaleTimeString(),
        Type: tx.type,
        Product: tx.product,
        'Volume (L)': tx.volume,
        Source: tx.source, // ID, strictly should be mapped to name but ID ok availability
        Destination: tx.destination,
        'Ref Doc': tx.referenceDoc,
        'Amount': tx.totalAmount || 0,
        Status: tx.status
    }));
    const txSheet = utils.json_to_sheet(txData);
    utils.book_append_sheet(workbook, txSheet, 'Transaction Details');

    writeFile(workbook, `End_of_Day_Report_${data.date}.xlsx`);
};

export const exportToPDF = (data: DailyReportData, companyName: string = 'Galaltix Energy') => {
    const doc = new jsPDF();
    const dateStr = new Date(data.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, 14, 20);
    doc.setFontSize(14);
    doc.text(`Daily End-of-Day Report`, 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${dateStr}`, 14, 36);

    let finalY = 40;

    // 1. Executive Summary (Calculated)
    const totalSalesVol = data.sales.reduce((acc, curr) => acc + curr.volume, 0);
    const totalRevenue = data.sales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalReceipts = data.receipts.reduce((acc, curr) => acc + curr.volume, 0);

    const summaryData = [
        ['Total Sales Volume', formatVolume(totalSalesVol)],
        ['Total Revenue Generated', formatCurrency(totalRevenue)],
        ['Total Product Received', formatVolume(totalReceipts)],
        ['Reconciliation Status', data.reconciliations.every(r => r.status === 'BALANCED') ? 'Fully Balanced' : 'Variances Detected']
    ];

    autoTable(doc, {
        startY: finalY,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
        styles: { fontSize: 10 }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // 2. Inventory Reconciliation
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Inventory Reconciliation', 14, finalY);

    const reconRows = data.reconciliations.map(r => [
        r.location,
        r.product,
        r.openingVolume.toLocaleString(),
        r.expectedVolume.toLocaleString(),
        r.actualVolume.toLocaleString(),
        r.variance > 0 ? `+${r.variance}` : r.variance.toString(),
        r.status.replace('_', ' ')
    ]);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Location', 'Product', 'Opening', 'Expected', 'Actual', 'Variance', 'Status']],
        body: reconRows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;

    // 3. Sales Breakdown
    doc.setFontSize(12);
    doc.text('Sales Breakdown by Product', 14, finalY);

    // Group sales
    const salesGroup = data.sales.reduce((acc, tx) => {
        if (!acc[tx.product]) acc[tx.product] = { vol: 0, amt: 0 };
        acc[tx.product].vol += tx.volume;
        acc[tx.product].amt += (tx.totalAmount || 0);
        return acc;
    }, {} as Record<string, { vol: number, amt: number }>);

    const salesRows = Object.entries(salesGroup).map(([prod, stat]) => [
        prod,
        stat.vol.toLocaleString() + ' L',
        formatCurrency(stat.amt)
    ]);

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Product', 'Volume Sold', 'Revenue']],
        body: salesRows,
        theme: 'striped',
        headStyles: { fillColor: [46, 204, 113] }
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, doc.internal.pageSize.height - 10);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`End_of_Day_Report_${data.date}.pdf`);
};
