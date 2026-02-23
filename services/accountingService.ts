// =====================================================
// ACCOUNTING SERVICE — APPWRITE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { Account, AccountType, JournalEntry, JournalEntryLine, JournalEntryStatus, ApiResponse, TrialBalance, TrialBalanceAccount, ProfitLossStatement, ProfitLossLine, BalanceSheet, BalanceSheetSection, BalanceSheetLine } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class AccountingService {
    async getAccounts(): Promise<ApiResponse<Account[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.ACCOUNTS, [Query.orderAsc('account_code')]);
            if (error) return { success: false, error };
            const accounts: Account[] = (data || []).map((a: any) => ({
                id: a.$id, companyId: a.company_id, accountCode: a.account_code,
                accountName: a.account_name, accountType: a.account_type as AccountType,
                accountSubtype: a.account_subtype, parentAccountId: a.parent_account_id,
                isActive: a.is_active !== false, createdAt: a.$createdAt
            }));
            return { success: true, data: accounts };
        } catch (error) { return { success: false, error: 'Failed to fetch accounts' }; }
    }

    async createAccount(accountData: Omit<Account, 'id' | 'createdAt' | 'isActive'>): Promise<ApiResponse<Account>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.ACCOUNTS, {
                company_id: DEFAULT_COMPANY_ID, account_code: accountData.accountCode,
                account_name: accountData.accountName, account_type: accountData.accountType,
                account_subtype: accountData.accountSubtype || '',
                parent_account_id: accountData.parentAccountId || '', is_active: true
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...accountData, id: data.$id, isActive: true, createdAt: data.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed to create account' }; }
    }

    async getJournalEntries(): Promise<ApiResponse<JournalEntry[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.JOURNAL_ENTRIES, [Query.orderDesc('entry_date')]);
            if (error) return { success: false, error };
            const entries: JournalEntry[] = (data || []).map((e: any) => ({
                id: e.$id, companyId: e.company_id, entryNumber: e.entry_number,
                entryDate: e.entry_date, description: e.description,
                referenceType: e.reference_type, referenceId: e.reference_id,
                totalDebit: Number(e.total_debit || 0), totalCredit: Number(e.total_credit || 0),
                status: e.status as JournalEntryStatus,
                createdBy: e.created_by || '', postedBy: e.posted_by, postedAt: e.posted_at,
                createdAt: e.$createdAt
            }));
            return { success: true, data: entries };
        } catch (error) { return { success: false, error: 'Failed to fetch journal entries' }; }
    }

    async createJournalEntry(
        entry: Omit<JournalEntry, 'id' | 'createdAt' | 'entryNumber' | 'totalDebit' | 'totalCredit'>,
        lines: Omit<JournalEntryLine, 'id' | 'journalEntryId' | 'createdAt'>[]
    ): Promise<ApiResponse<JournalEntry>> {
        try {
            const totalDebit = lines.reduce((sum, l) => sum + Number(l.debitAmount || 0), 0);
            const totalCredit = lines.reduce((sum, l) => sum + Number(l.creditAmount || 0), 0);
            const entryNumber = `JE-${Date.now()}`;
            const { data, error } = await dbCreate(COLLECTIONS.JOURNAL_ENTRIES, {
                company_id: DEFAULT_COMPANY_ID, entry_number: entryNumber,
                entry_date: entry.entryDate, description: entry.description || '',
                reference_type: entry.referenceType || '', reference_id: entry.referenceId || '',
                total_debit: totalDebit, total_credit: totalCredit,
                status: entry.status || 'DRAFT', created_by: entry.createdBy || '',
                lines: JSON.stringify(lines)
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...entry, id: data.$id, entryNumber, totalDebit, totalCredit, createdAt: data.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed to create journal entry' }; }
    }

    async getTrialBalance(asOfDate: string): Promise<ApiResponse<TrialBalance>> {
        try {
            const { data: accounts } = await dbList(COLLECTIONS.ACCOUNTS, [Query.equal('is_active', true)]);
            const tbAccounts: TrialBalanceAccount[] = (accounts || []).map((a: any) => {
                const bal = Number(a.balance || 0);
                return { accountCode: a.account_code, accountName: a.account_name, debitBalance: bal > 0 ? bal : 0, creditBalance: bal < 0 ? Math.abs(bal) : 0 };
            });
            return { success: true, data: { asOfDate, accounts: tbAccounts, totalDebits: tbAccounts.reduce((s, a) => s + a.debitBalance, 0), totalCredits: tbAccounts.reduce((s, a) => s + a.creditBalance, 0) } };
        } catch (error) { return { success: false, error: 'Failed to generate trial balance' }; }
    }

    async getProfitLossStatement(fromDate: string, toDate: string): Promise<ApiResponse<ProfitLossStatement>> {
        try {
            const { data: accounts } = await dbList(COLLECTIONS.ACCOUNTS, [Query.equal('is_active', true)]);
            const rev: ProfitLossLine[] = (accounts || []).filter((a: any) => a.account_type === 'REVENUE').map((a: any) => ({ accountCode: a.account_code, accountName: a.account_name, amount: Math.abs(Number(a.balance || 0)) }));
            const exp: ProfitLossLine[] = (accounts || []).filter((a: any) => a.account_type === 'EXPENSE').map((a: any) => ({ accountCode: a.account_code, accountName: a.account_name, amount: Math.abs(Number(a.balance || 0)) }));
            const totalRevenue = rev.reduce((s, l) => s + l.amount, 0);
            const totalExpenses = exp.reduce((s, l) => s + l.amount, 0);
            return { success: true, data: { fromDate, toDate, revenue: rev, expenses: exp, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses } };
        } catch (error) { return { success: false, error: 'Failed to generate P&L' }; }
    }

    async getBalanceSheet(asOfDate: string): Promise<ApiResponse<BalanceSheet>> {
        try {
            const { data: accounts } = await dbList(COLLECTIONS.ACCOUNTS, [Query.equal('is_active', true)]);
            const mapSection = (types: string[]): BalanceSheetSection => {
                const items: BalanceSheetLine[] = (accounts || []).filter((a: any) => types.includes(a.account_type)).map((a: any) => ({ accountCode: a.account_code, accountName: a.account_name, amount: Math.abs(Number(a.balance || 0)) }));
                return { items, total: items.reduce((s, l) => s + l.amount, 0) };
            };
            const assets = mapSection(['ASSET']); const liabilities = mapSection(['LIABILITY']); const equity = mapSection(['EQUITY', 'REVENUE', 'EXPENSE']);
            return { success: true, data: { asOfDate, assets, liabilities, equity, totalAssets: assets.total, totalLiabilitiesAndEquity: liabilities.total + equity.total } };
        } catch (error) { return { success: false, error: 'Failed to generate balance sheet' }; }
    }
}
