// =====================================================
// DOCUMENT SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, dbDelete, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { ApiResponse, SalesContract, Buyer, Shipment, DocumentType } from '../types_commodity';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

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
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('INVOICE', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Contract: ${contract.contractNumber}`, 20, 40);
        doc.text(`Buyer: ${buyer.name}`, 20, 50);
        doc.text(`Commodity Qty: ${contract.contractedQuantity} MT`, 20, 60);
        doc.text(`Price: ${contract.currency} ${contract.pricePerTon}/MT`, 20, 70);
        doc.text(`Total Value: ${contract.currency} ${contract.totalValue.toLocaleString()}`, 20, 80);
        doc.text(`Date: ${contract.contractDate}`, 20, 90);
        doc.text(`Status: ${contract.status}`, 20, 100);
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
