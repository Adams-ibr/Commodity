// =====================================================
// COMPLIANCE SERVICE — APPWRITE
// =====================================================
import { dbList, dbCreate, dbUpdate, dbGet, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { ExportCompliance, ComplianceStatus, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class ComplianceService {
    // NESS fee is 0.5% of FOB value (Nigerian Export Supervision Scheme)
    calculateNESS(fobValue: number): number {
        return Math.round(fobValue * 0.005 * 100) / 100;
    }

    async getAllComplianceRecords(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExportCompliance[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.COMPLIANCE_RECORDS, [
                Query.equal('company_id', companyId), Query.orderDesc('$createdAt')
            ]);
            if (error) return { success: false, error };
            const records: ExportCompliance[] = (data || []).map((r: any) => ({
                id: r.$id, companyId: r.company_id, shipmentId: r.shipment_id,
                nepcRegistration: r.nepc_registration, nxpFormNumber: r.nxp_form_number,
                phytosanitaryCertificate: r.phytosanitary_certificate,
                certificateOfOrigin: r.certificate_of_origin,
                exportPermit: r.export_permit, nessFeePaid: r.ness_fee_paid,
                nessAmount: Number(r.ness_amount || 0), cciNumber: r.cci_number,
                vatRate: r.vat_rate, withholdingTaxRate: r.withholding_tax_rate,
                complianceStatus: r.compliance_status as ComplianceStatus,
                verifiedBy: r.verified_by, verifiedAt: r.verified_at,
                createdAt: r.$createdAt
            }));
            return { success: true, data: records };
        } catch (error) { return { success: false, error: 'Failed to fetch compliance records' }; }
    }

    async updateCompliance(shipmentId: string, complianceData: Partial<ExportCompliance>): Promise<ApiResponse<ExportCompliance>> {
        try {
            // Check if a record exists for this shipment
            const { data: existing } = await dbList(COLLECTIONS.COMPLIANCE_RECORDS, [
                Query.equal('shipment_id', shipmentId), Query.limit(1)
            ]);

            const payload: any = {
                shipment_id: shipmentId, company_id: DEFAULT_COMPANY_ID,
                nepc_registration: complianceData.nepcRegistration || '',
                nxp_form_number: complianceData.nxpFormNumber || '',
                phytosanitary_certificate: complianceData.phytosanitaryCertificate || '',
                certificate_of_origin: complianceData.certificateOfOrigin || '',
                export_permit: complianceData.exportPermit || '',
                ness_fee_paid: complianceData.nessFeePaid || false,
                ness_amount: complianceData.nessAmount || 0,
                cci_number: complianceData.cciNumber || '',
                compliance_status: complianceData.complianceStatus || 'PENDING'
            };

            let result;
            if (existing && existing.length > 0) {
                result = await dbUpdate(COLLECTIONS.COMPLIANCE_RECORDS, (existing[0] as any).$id, payload);
            } else {
                result = await dbCreate(COLLECTIONS.COMPLIANCE_RECORDS, payload);
            }

            if (result.error || !result.data) return { success: false, error: result.error || 'Failed' };
            const d = result.data as any;
            return {
                success: true, data: {
                    id: d.$id, companyId: d.company_id, shipmentId: d.shipment_id,
                    nepcRegistration: d.nepc_registration, nxpFormNumber: d.nxp_form_number,
                    phytosanitaryCertificate: d.phytosanitary_certificate,
                    certificateOfOrigin: d.certificate_of_origin, exportPermit: d.export_permit,
                    nessFeePaid: d.ness_fee_paid, nessAmount: Number(d.ness_amount || 0),
                    cciNumber: d.cci_number, complianceStatus: d.compliance_status as ComplianceStatus,
                    verifiedBy: d.verified_by, verifiedAt: d.verified_at, createdAt: d.$createdAt
                }
            };
        } catch (error) { return { success: false, error: 'Failed to update compliance' }; }
    }

    async getRecords(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExportCompliance[]>> {
        return this.getAllComplianceRecords(companyId);
    }
}
