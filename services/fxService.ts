// =====================================================
// FX SERVICE — SUPABASE
// =====================================================
import { dbList, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { ExchangeRate, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class FXService {
    async getExchangeRates(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExchangeRate[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.EXCHANGE_RATES, [
                Query.equal('company_id', companyId), Query.orderDesc('rate_date')
            ]);
            if (error) return { success: false, error };
            const rates: ExchangeRate[] = (data || []).map((r: any) => ({
                id: r.$id, companyId: r.company_id, fromCurrency: r.from_currency,
                toCurrency: r.to_currency, rate: Number(r.rate),
                rateDate: r.rate_date, source: r.source,
                isActive: r.is_active !== false, createdAt: r.$createdAt
            }));
            return { success: true, data: rates };
        } catch (error) { return { success: false, error: 'Failed to fetch exchange rates' }; }
    }

    async createExchangeRate(rateData: Omit<ExchangeRate, 'id' | 'createdAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExchangeRate>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.EXCHANGE_RATES, {
                company_id: companyId, from_currency: rateData.fromCurrency,
                to_currency: rateData.toCurrency, rate: rateData.rate,
                rate_date: rateData.rateDate, source: rateData.source || 'MANUAL',
                is_active: rateData.isActive !== false
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...rateData, id: data.$id, createdAt: data.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed to create exchange rate' }; }
    }

    // Alias used by FXManager component
    async updateExchangeRate(rateData: Omit<ExchangeRate, 'id' | 'createdAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExchangeRate>> {
        return this.createExchangeRate(rateData, companyId);
    }

    async getLatestRate(fromCurrency: string, toCurrency: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ExchangeRate>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.EXCHANGE_RATES, [
                Query.equal('company_id', companyId),
                Query.equal('from_currency', fromCurrency),
                Query.equal('to_currency', toCurrency),
                Query.orderDesc('rate_date'), Query.limit(1)
            ]);
            if (error || !data || data.length === 0) return { success: false, error: error || 'No rate found' };
            const r = data[0] as any;
            return { success: true, data: { id: r.$id, companyId: r.company_id, fromCurrency: r.from_currency, toCurrency: r.to_currency, rate: Number(r.rate), rateDate: r.rate_date, source: r.source, isActive: r.is_active !== false, createdAt: r.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed to fetch latest rate' }; }
    }

    async convertAmount(amount: number, fromCurrency: string, toCurrency: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<{ convertedAmount: number; rate: number }>> {
        if (fromCurrency === toCurrency) return { success: true, data: { convertedAmount: amount, rate: 1 } };
        const rateRes = await this.getLatestRate(fromCurrency, toCurrency, companyId);
        if (!rateRes.success || !rateRes.data) return { success: false, error: rateRes.error || 'No rate available' };
        return { success: true, data: { convertedAmount: amount * rateRes.data.rate, rate: rateRes.data.rate } };
    }
}
