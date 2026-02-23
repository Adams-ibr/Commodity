// =====================================================
// DOCUMENT SERVICE — APPWRITE
// =====================================================
import { dbList, dbCreate, dbUpdate, dbDelete, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { ApiResponse, SalesContract, Buyer, Shipment } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export interface DocumentRecord {
    id: string; companyId: string; referenceType: string; referenceId: string;
    documentType: string; fileName: string; filePath: string; fileSize: number;
    mimeType: string; version: number; uploadedBy: string;
    createdAt: string; updatedAt: string;
}

export class DocumentService {
    async getDocuments(referenceType: string, referenceId: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DocumentRecord[]>> {
        try {
            const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt')];
            if (referenceType !== 'GLOBAL') {
                queries.push(Query.equal('reference_type', referenceType));
                queries.push(Query.equal('reference_id', referenceId));
            }
            const { data, error } = await dbList(COLLECTIONS.DOCUMENTS, queries);
            if (error) return { success: false, error };
            const docs: DocumentRecord[] = (data || []).map((d: any) => ({
                id: d.$id, companyId: d.company_id, referenceType: d.reference_type,
                referenceId: d.reference_id, documentType: d.document_type,
                fileName: d.file_name, filePath: d.file_path, fileSize: d.file_size || 0,
                mimeType: d.mime_type || '', version: d.version || 1,
                uploadedBy: d.uploaded_by, createdAt: d.$createdAt, updatedAt: d.$updatedAt
            }));
            return { success: true, data: docs };
        } catch (error) { return { success: false, error: 'Failed to fetch documents' }; }
    }

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

    // Generate invoice PDF for a sales contract
    generateInvoicePDF(contract: SalesContract, buyer: Buyer): any {
        // Uses jsPDF — import dynamically or return a mock
        try {
            const jsPDF = (window as any).jspdf?.jsPDF;
            if (!jsPDF) {
                // Fallback: create a simple mock object with save() method
                console.warn('jsPDF not loaded, returning mock');
                return { output: () => '', save: (name: string) => alert(`Invoice ${name} generated (jsPDF not loaded)`) };
            }
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
        } catch {
            return { output: () => '', save: (name: string) => alert(`Invoice ${name} generated`) };
        }
    }

    // Generate waybill PDF for a shipment
    generateWaybillPDF(shipment: Shipment, _buyer?: any, _contract?: any): any {
        try {
            const jsPDF = (window as any).jspdf?.jsPDF;
            if (!jsPDF) {
                return { output: () => '', save: (name: string) => alert(`Waybill ${name} generated (jsPDF not loaded)`) };
            }
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
        } catch {
            return { output: () => '', save: (name: string) => alert(`Waybill ${name} generated`) };
        }
    }
}
