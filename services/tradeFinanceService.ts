// =====================================================
// TRADE FINANCE SERVICE — APPWRITE
// =====================================================
import { dbList, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { LetterOfCredit, LetterOfCreditStatus, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class TradeFinanceService {
    async getLettersOfCredit(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<LetterOfCredit[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.TRADE_FINANCE, [
                Query.equal('company_id', companyId), Query.orderDesc('$createdAt')
            ]);
            if (error) return { success: false, error };
            const lcs: LetterOfCredit[] = (data || []).map((r: any) => ({
                id: r.$id, companyId: r.company_id, lcNumber: r.lc_number,
                salesContractId: r.sales_contract_id, buyerId: r.buyer_id,
                issuingBank: r.issuing_bank, advisingBank: r.advising_bank,
                amount: Number(r.amount), currency: r.currency,
                issueDate: r.issue_date, expiryDate: r.expiry_date,
                status: r.status as LetterOfCreditStatus, createdAt: r.$createdAt
            }));
            return { success: true, data: lcs };
        } catch (error) { return { success: false, error: 'Failed to fetch LCs' }; }
    }

    async createLetterOfCredit(lcData: Omit<LetterOfCredit, 'id' | 'createdAt' | 'status'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<LetterOfCredit>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.TRADE_FINANCE, {
                company_id: companyId, lc_number: lcData.lcNumber,
                sales_contract_id: lcData.salesContractId, buyer_id: lcData.buyerId,
                issuing_bank: lcData.issuingBank, advising_bank: lcData.advisingBank || '',
                amount: lcData.amount, currency: lcData.currency,
                issue_date: lcData.issueDate, expiry_date: lcData.expiryDate,
                status: LetterOfCreditStatus.ACTIVE
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...lcData, id: data.$id, status: LetterOfCreditStatus.ACTIVE, createdAt: data.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed to create LC' }; }
    }

    async updateLCStatus(id: string, status: LetterOfCreditStatus): Promise<ApiResponse<void>> {
        try {
            const { error } = await dbUpdate(COLLECTIONS.TRADE_FINANCE, id, { status });
            if (error) return { success: false, error };
            return { success: true };
        } catch (error) { return { success: false, error: 'Failed to update LC status' }; }
    }

    // Keep backward compat
    async getRecords(companyId: string = DEFAULT_COMPANY_ID) { return this.getLettersOfCredit(companyId); }
}
