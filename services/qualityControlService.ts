// =====================================================
// QUALITY CONTROL SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { QualityTest, QualityTestStatus, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class QualityControlService {
    async getTests(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<QualityTest[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.QUALITY_TESTS, [
                Query.equal('company_id', companyId), Query.orderDesc('$createdAt')
            ]);
            if (error) return { success: false, error };
            const tests: QualityTest[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, batchId: item.batch_id,
                testNumber: item.test_number || '', testDate: item.test_date,
                moisturePercentage: item.moisture_percentage,
                impurityPercentage: item.impurity_percentage,
                aflatoxinLevel: item.aflatoxin_level,
                proteinContent: item.protein_content, oilContent: item.oil_content,
                otherParameters: item.other_parameters ? JSON.parse(item.other_parameters) : undefined,
                gradeCalculated: item.grade_calculated, status: item.status as QualityTestStatus,
                testedBy: item.tested_by, approvedBy: item.approved_by,
                approvedAt: item.approved_at, rejectionReason: item.rejection_reason,
                labCertificateUrl: item.lab_certificate_url, createdAt: item.$createdAt
            }));
            return { success: true, data: tests };
        } catch (error) { return { success: false, error: 'Failed to fetch quality tests' }; }
    }

    async createTest(
        testData: Partial<QualityTest> & { batchId: string; testDate: string; testedBy: string },
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<QualityTest>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.QUALITY_TESTS, {
                company_id: companyId, batch_id: testData.batchId,
                test_number: testData.testNumber || `QT-${Date.now()}`, test_date: testData.testDate,
                moisture_percentage: testData.moisturePercentage || 0,
                impurity_percentage: testData.impurityPercentage || 0,
                aflatoxin_level: testData.aflatoxinLevel || 0,
                protein_content: testData.proteinContent || 0,
                oil_content: testData.oilContent || 0,
                other_parameters: testData.otherParameters ? JSON.stringify(testData.otherParameters) : '',
                grade_calculated: testData.gradeCalculated || '',
                status: testData.status || 'PENDING',
                tested_by: testData.testedBy, approved_by: testData.approvedBy || '',
                approved_at: testData.approvedAt || '', rejection_reason: testData.rejectionReason || '',
                lab_certificate_url: testData.labCertificateUrl || ''
            });
            if (error || !data) return { success: false, error: error || 'Failed to create test' };
            const result: QualityTest = {
                id: data.$id, companyId: companyId, batchId: testData.batchId,
                testNumber: testData.testNumber || `QT-${Date.now()}`, testDate: testData.testDate,
                moisturePercentage: testData.moisturePercentage, impurityPercentage: testData.impurityPercentage,
                aflatoxinLevel: testData.aflatoxinLevel, proteinContent: testData.proteinContent,
                oilContent: testData.oilContent, otherParameters: testData.otherParameters,
                gradeCalculated: testData.gradeCalculated, status: (testData.status || 'PENDING') as QualityTestStatus,
                testedBy: testData.testedBy, approvedBy: testData.approvedBy,
                approvedAt: testData.approvedAt, rejectionReason: testData.rejectionReason,
                labCertificateUrl: testData.labCertificateUrl, createdAt: data.$createdAt
            };
            return { success: true, data: result };
        } catch (error) { return { success: false, error: 'Failed to create quality test' }; }
    }

    async updateTestStatus(id: string, status: string, approvedBy?: string, _batchId?: string): Promise<ApiResponse<QualityTest>> {
        try {
            const payload: any = { status };
            if (approvedBy) {
                payload.approved_by = approvedBy;
                payload.approved_at = new Date().toISOString();
            }
            const { data, error } = await dbUpdate(COLLECTIONS.QUALITY_TESTS, id, payload);
            if (error) return { success: false, error };
            // Fetch the updated test to return it
            const { data: updated, error: fetchErr } = await dbGet(COLLECTIONS.QUALITY_TESTS, id);
            if (fetchErr || !updated) return { success: true, data: undefined as any };
            const item = updated as any;
            return {
                success: true, data: {
                    id: item.$id, companyId: item.company_id, batchId: item.batch_id,
                    testNumber: item.test_number || '', testDate: item.test_date,
                    moisturePercentage: item.moisture_percentage, impurityPercentage: item.impurity_percentage,
                    aflatoxinLevel: item.aflatoxin_level, proteinContent: item.protein_content, oilContent: item.oil_content,
                    otherParameters: item.other_parameters ? JSON.parse(item.other_parameters) : undefined,
                    gradeCalculated: item.grade_calculated, status: item.status as QualityTestStatus,
                    testedBy: item.tested_by, approvedBy: item.approved_by,
                    approvedAt: item.approved_at, rejectionReason: item.rejection_reason,
                    labCertificateUrl: item.lab_certificate_url, createdAt: item.$createdAt
                }
            };
        } catch (error) { return { success: false, error: 'Failed to update test status' }; }
    }

    async getTestsByBatch(batchId: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<QualityTest[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.QUALITY_TESTS, [
                Query.equal('batch_id', batchId), Query.equal('company_id', companyId), Query.orderDesc('test_date')
            ]);
            if (error) return { success: false, error };
            const tests: QualityTest[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, batchId: item.batch_id,
                testNumber: item.test_number || '', testDate: item.test_date,
                moisturePercentage: item.moisture_percentage,
                impurityPercentage: item.impurity_percentage,
                aflatoxinLevel: item.aflatoxin_level,
                proteinContent: item.protein_content, oilContent: item.oil_content,
                otherParameters: item.other_parameters ? JSON.parse(item.other_parameters) : undefined,
                gradeCalculated: item.grade_calculated, status: item.status as QualityTestStatus,
                testedBy: item.tested_by, approvedBy: item.approved_by,
                approvedAt: item.approved_at, rejectionReason: item.rejection_reason,
                labCertificateUrl: item.lab_certificate_url, createdAt: item.$createdAt
            }));
            return { success: true, data: tests };
        } catch (error) { return { success: false, error: 'Failed to fetch tests for batch' }; }
    }
}
