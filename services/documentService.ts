// =====================================================
// DOCUMENT SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, dbDelete, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { ApiResponse, SalesContract, Buyer, Shipment, DocumentType } from '../types_commodity';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from '../utils/logoBase64';
const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export interface DocumentRecord {
    id: string; companyId: string; referenceType: string; referenceId: string;
    documentType: string; fileName: string; filePath: string; fileSize: number;
    mimeType: string; version: number; uploadedBy: string;
    createdAt: string; updatedAt: string;
}

export interface DocumentSearchParams {
    query?: string;
    documentType?: string;
    referenceType?: string;
    dateFrom?: string;
    dateTo?: string;
    companyId?: string;
}

function mapDoc(d: any): DocumentRecord {
    return {
        id: d.$id, companyId: d.company_id, referenceType: d.reference_type,
        referenceId: d.reference_id, documentType: d.document_type,
        fileName: d.file_name, filePath: d.file_path, fileSize: d.file_size || 0,
        mimeType: d.mime_type || '', version: d.version || 1,
        uploadedBy: d.uploaded_by, createdAt: d.$createdAt, updatedAt: d.$updatedAt
    };
}

export class DocumentService {
    // ──── Fetch documents by reference ────
    async getDocuments(referenceType: string, referenceId: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DocumentRecord[]>> {
        try {
            const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt')];
            if (referenceType !== 'GLOBAL') {
                queries.push(Query.equal('reference_type', referenceType));
                queries.push(Query.equal('reference_id', referenceId));
            }
            const { data, error } = await dbList(COLLECTIONS.DOCUMENTS, queries);
            if (error) return { success: false, error };
            return { success: true, data: (data || []).map(mapDoc) };
        } catch (error) { return { success: false, error: 'Failed to fetch documents' }; }
    }

    // ──── Fetch ALL documents (global library) with optional search ────
    async getAllDocuments(params: DocumentSearchParams = {}): Promise<ApiResponse<DocumentRecord[]>> {
        try {
            const companyId = params.companyId || DEFAULT_COMPANY_ID;
            const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt'), Query.limit(200)];

            if (params.documentType) queries.push(Query.equal('document_type', params.documentType));
            if (params.referenceType) queries.push(Query.equal('reference_type', params.referenceType));

            const { data, error } = await dbList(COLLECTIONS.DOCUMENTS, queries);
            if (error) return { success: false, error };

            let docs = (data || []).map(mapDoc);

            // Client-side text search for filtering
            if (params.query) {
                const q = params.query.toLowerCase();
                docs = docs.filter(d =>
                    d.fileName.toLowerCase().includes(q) ||
                    d.documentType.toLowerCase().includes(q) ||
                    d.uploadedBy.toLowerCase().includes(q)
                );
            }

            // Client-side date filtering
            if (params.dateFrom) {
                const from = new Date(params.dateFrom);
                docs = docs.filter(d => new Date(d.createdAt) >= from);
            }
            if (params.dateTo) {
                const to = new Date(params.dateTo);
                to.setHours(23, 59, 59, 999);
                docs = docs.filter(d => new Date(d.createdAt) <= to);
            }

            return { success: true, data: docs };
        } catch (error) { return { success: false, error: 'Failed to search documents' }; }
    }

    // ──── Get version history for a file ────
    async getDocumentVersions(fileName: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DocumentRecord[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.DOCUMENTS, [
                Query.equal('company_id', companyId),
                Query.equal('file_name', fileName),
                Query.orderDesc('version')
            ]);
            if (error) return { success: false, error };
            return { success: true, data: (data || []).map(mapDoc) };
        } catch (error) { return { success: false, error: 'Failed to fetch document versions' }; }
    }

    // ──── Create document ────
    async createDocument(docData: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DocumentRecord>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.DOCUMENTS, {
                company_id: companyId, reference_type: docData.referenceType,
                reference_id: docData.referenceId, document_type: docData.documentType,
                file_name: docData.fileName, file_path: docData.filePath,
                file_size: docData.fileSize || 0, mime_type: docData.mimeType || '',
                version: docData.version || 1, uploaded_by: docData.uploadedBy
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...docData, id: data.$id, createdAt: data.$createdAt, updatedAt: data.$updatedAt } };
        } catch (error) { return { success: false, error: 'Failed to create document' }; }
    }

    // ──── Update document metadata (bumps version) ────
    async updateDocument(id: string, updates: Partial<DocumentRecord>): Promise<ApiResponse<DocumentRecord>> {
        try {
            const payload: any = {};
            if (updates.fileName) payload.file_name = updates.fileName;
            if (updates.documentType) payload.document_type = updates.documentType;
            if (updates.filePath) payload.file_path = updates.filePath;
            if (updates.fileSize !== undefined) payload.file_size = updates.fileSize;
            if (updates.mimeType) payload.mime_type = updates.mimeType;
            if (updates.version !== undefined) payload.version = updates.version;

            const { data, error } = await dbUpdate(COLLECTIONS.DOCUMENTS, id, payload);
            if (error) return { success: false, error };

            const { data: updated, error: fetchErr } = await dbGet(COLLECTIONS.DOCUMENTS, id);
            if (fetchErr || !updated) return { success: true, data: undefined as any };
            return { success: true, data: mapDoc(updated) };
        } catch (error) { return { success: false, error: 'Failed to update document' }; }
    }

    // ──── Delete document ────
    async deleteDocument(id: string): Promise<ApiResponse<boolean>> {
        try {
            const { success, error } = await dbDelete(COLLECTIONS.DOCUMENTS, id);
            if (!success) return { success: false, error: error || 'Failed' };
            return { success: true, data: true };
        } catch (error) { return { success: false, error: 'Failed to delete document' }; }
    }

    // Alias used by components
    async recordDocument(docData: any): Promise<ApiResponse<DocumentRecord>> {
        return this.createDocument(docData);
    }

    // ──── PDF Generation ────
    generateInvoicePDF(contract: SalesContract, buyer: Buyer): jsPDF {
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.width;

        // --- 1. Header ---
        // Add Logo Image
        doc.addImage(LOGO_BASE64, 'PNG', 14, 12, 55, 25);

        // Company Info
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('123 Trade Center, Lagos, Nigeria', 15, 43);
        doc.text('contact@galaltix.com | +234 800 000 0000', 15, 48);

        // "INVOICE" Badge aligned to the right
        doc.setTextColor(79, 70, 229); // Indigo-600
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', pageWidth - 15, 25, { align: 'right' });

        // Header separator
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.5);
        doc.line(15, 55, pageWidth - 15, 55);

        // --- 2. Meta Information Section ---
        const metaY = 65;
        doc.setTextColor(51, 65, 85); // Slate-700

        // Left column (Billed To)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BILLED TO:', 15, metaY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(buyer.name, 15, metaY + 7);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        let currentY = metaY + 13;
        if (buyer.address) {
            const addr = [buyer.address.street, buyer.address.city, buyer.address.state, buyer.address.country].filter(Boolean).join(', ');
            if (addr) {
                doc.text(addr, 15, currentY);
                currentY += 6;
            }
        }
        if (buyer.email) {
            doc.text(buyer.email, 15, currentY);
            currentY += 6;
        }
        if (buyer.phone) {
            doc.text(buyer.phone, 15, currentY);
        }

        // Right column (Invoice Details)
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(10);

        // Define some standard x-positions for right alignment
        // The values are right-aligned at pageWidth - 15.
        // Let's place the right-aligned labels much nearer to the values, around pageWidth - 45.
        const rightLabelX = pageWidth - 45;
        const rightValueX = pageWidth - 15;

        doc.setFont('helvetica', 'bold');
        doc.text('Invoice Number:', rightLabelX, metaY, { align: 'right' });
        doc.text('Contract ID:', rightLabelX, metaY + 7, { align: 'right' });
        doc.text('Date Issued:', rightLabelX, metaY + 14, { align: 'right' });
        doc.text('Status:', rightLabelX, metaY + 21, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text(`INV-${contract.contractNumber}`, rightValueX, metaY, { align: 'right' });
        doc.text(contract.contractNumber, rightValueX, metaY + 7, { align: 'right' });
        doc.text(new Date(contract.contractDate).toLocaleDateString(), rightValueX, metaY + 14, { align: 'right' });

        // Status Badge (Visual)
        doc.setTextColor(79, 70, 229);
        doc.setFont('helvetica', 'bold');
        doc.text(contract.status, rightValueX, metaY + 21, { align: 'right' });

        // --- 3. Items Table ---
        const tableStartY = 105;

        let tableData = [];
        if (contract.items && contract.items.length > 0) {
            tableData = contract.items.map(item => [
                'Commodity (See Contract)',
                item.grade || 'Standard',
                `${item.quantity} MT`,
                `${item.currency} ${item.unitPrice.toLocaleString()}`,
                `${item.currency} ${(item.quantity * item.unitPrice).toLocaleString()}`
            ]);
        } else {
            tableData = [
                [
                    'Commodity Export',
                    'Standard',
                    `${contract.contractedQuantity} MT`,
                    `${contract.currency} ${contract.pricePerTon?.toLocaleString() || 0}`,
                    `${contract.currency} ${contract.totalValue?.toLocaleString() || 0}`
                ]
            ];
        }

        autoTable(doc, {
            startY: tableStartY,
            head: [['Description', 'Grade', 'Quantity', 'Unit Price', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo-600
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'left' },
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50
            },
            styles: {
                font: 'helvetica',
                fontSize: 10,
                textColor: [51, 65, 85],
                cellPadding: 6,
                lineColor: [226, 232, 240], // Slate-200
                lineWidth: 0.1
            }
        });

        // --- 4. Totals Summary ---
        // @ts-ignore
        const finalY = doc.lastAutoTable.finalY + 15;

        // Summary box on the right
        const summaryBoxWidth = 80;
        const summaryBoxX = pageWidth - 15 - summaryBoxWidth;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(summaryBoxX, finalY, summaryBoxWidth, 40, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(summaryBoxX, finalY, summaryBoxWidth, 40, 3, 3, 'S');

        doc.setFontSize(10);
        // Force the text color to a strict dark slate (51, 65, 85) for the subtotal block, overriding the jspdf-autotable defaults.
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        // Increase padding from 10 to 15 to give space between the box left border and the text
        doc.text('Subtotal:', summaryBoxX + 15, finalY + 12);
        doc.text('Tax (0%):', summaryBoxX + 15, finalY + 20);

        doc.setFont('helvetica', 'bold');
        doc.text(`${contract.currency} ${contract.totalValue?.toLocaleString() || 0}`, rightValueX - 5, finalY + 12, { align: 'right' });
        doc.text(`${contract.currency} 0.00`, rightValueX - 5, finalY + 20, { align: 'right' });

        // Divider line
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.line(summaryBoxX + 15, finalY + 26, rightValueX - 5, finalY + 26);

        // Total
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.setFont('helvetica', 'bold');
        doc.text('Total Due:', summaryBoxX + 10, finalY + 34);
        doc.text(`${contract.currency} ${contract.totalValue?.toLocaleString() || 0}`, rightValueX - 5, finalY + 34, { align: 'right' });

        // --- 5. Footer and Payment Info ---
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Info & Terms', 15, finalY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Please make payment by the due date specified. Includes all applicable', 15, finalY + 12);
        doc.text('export processing fees based on FOB terms unless otherwise specified.', 15, finalY + 17);
        if (buyer.paymentTerms) {
            doc.text(`Terms: ${buyer.paymentTerms}`, 15, finalY + 24);
        }

        // Page border bottom signature area
        const pageHeight = doc.internal.pageSize.height;
        doc.setDrawColor(226, 232, 240);
        doc.line(15, pageHeight - 30, pageWidth - 15, pageHeight - 30);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('Generated electronically by Galaltix Commodities ERP Software. Valid without physical signature.', 15, pageHeight - 20);

        return doc;
    }

    generateWaybillPDF(shipment: Shipment, _buyer?: any, _contract?: any): jsPDF {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('WAYBILL', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Shipment: ${shipment.shipmentNumber}`, 20, 40);
        doc.text(`Vessel: ${shipment.vesselName || 'N/A'}`, 20, 50);
        doc.text(`Loading Port: ${shipment.loadingPort || 'N/A'}`, 20, 60);
        doc.text(`Destination: ${shipment.destinationPort || 'N/A'}`, 20, 70);
        doc.text(`Total Qty: ${shipment.totalQuantity} MT`, 20, 80);
        doc.text(`B/L: ${shipment.billOfLading || 'N/A'}`, 20, 90);
        return doc;
    }
}
