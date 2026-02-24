// =====================================================
// REPORTING SERVICE — APPWRITE
// =====================================================
import { dbList, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export interface DashboardKPIs {
    totalInventoryWeight: number; activePurchaseContracts: number;
    activeSalesContracts: number; pendingQualityTests: number;
    shipmentsInTransit: number; totalSuppliers: number; totalBuyers: number;
    procurementSpend: number; salesRevenue: number; processingOrdersActive: number;
}

export interface CommodityProfitRow {
    commodityTypeId: string; commodityName: string; commodityCode: string;
    totalPurchasedMT: number; totalSoldMT: number;
    procurementCost: number; salesRevenue: number; grossProfit: number; marginPercent: number;
}

export interface StockAgingRow {
    batchId: string; batchNumber: string; commodityTypeId: string; commodityName: string;
    locationId: string; locationName: string; currentWeight: number;
    receivedDate: string; ageDays: number; grade: string; status: string;
}

export interface SupplierScorecardRow {
    supplierId: string; supplierName: string; supplierType: string;
    totalContracts: number; completedContracts: number; totalVolumeMT: number;
    totalPurchaseValue: number; avgPricePerTon: number; performanceRating: number; fulfillmentRate: number;
}

export interface ProcessingYieldRow {
    processingType: string; totalOrders: number; completedOrders: number;
    totalInputMT: number; totalOutputMT: number; yieldPercent: number;
}

export interface BuyerPerformanceRow {
    buyerId: string; buyerName: string; buyerType: string;
    totalContracts: number; totalContractedMT: number; totalShippedMT: number;
    totalContractValue: number; fulfillmentRate: number;
}

// Safe wrapper: returns empty data instead of throwing on missing collection/attribute
async function safeDbList(collection: string, queries: string[] = []): Promise<{ data: any[]; total: number }> {
    try {
        const res = await dbList(collection, queries);
        if (res.error) return { data: [], total: 0 };
        return { data: res.data || [], total: res.total || 0 };
    } catch {
        return { data: [], total: 0 };
    }
}

export class ReportingService {
    async getDashboardKPIs(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DashboardKPIs>> {
        try {
            const [batchesRes, pcRes, scRes, qcRes, shipRes, suppRes, buyRes, procRes] = await Promise.all([
                safeDbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.PURCHASE_CONTRACTS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.QUALITY_TESTS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.SHIPMENTS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.SUPPLIERS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.BUYERS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.PROCESSING_ORDERS, [Query.equal('company_id', companyId), Query.limit(500)])
            ]);
            const batches = batchesRes.data;
            const pc = pcRes.data;
            const sc = scRes.data;
            const totalInventoryWeight = batches.reduce((s: number, b: any) => s + Number(b.current_weight || 0), 0);
            const activePurchaseContracts = pc.filter((c: any) => c.status === 'ACTIVE').length;
            const activeSalesContracts = sc.filter((c: any) => c.status === 'ACTIVE').length;
            const procurementSpend = pc.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0);
            const salesRevenue = sc.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0);
            return {
                success: true, data: {
                    totalInventoryWeight: Math.round(totalInventoryWeight * 100) / 100,
                    activePurchaseContracts, activeSalesContracts,
                    pendingQualityTests: qcRes.data.filter((t: any) => t.status === 'PENDING').length,
                    shipmentsInTransit: shipRes.data.filter((s: any) => s.status === 'IN_TRANSIT').length,
                    totalSuppliers: suppRes.data.filter((s: any) => s.is_active !== false).length,
                    totalBuyers: buyRes.data.filter((b: any) => b.is_active !== false).length,
                    procurementSpend, salesRevenue,
                    processingOrdersActive: procRes.data.filter((o: any) => o.status === 'IN_PROGRESS').length
                }
            };
        } catch (error) { return { success: false, error: 'Failed to fetch dashboard KPIs' }; }
    }

    async getCommodityProfitSummary(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityProfitRow[]>> {
        try {
            const ctRes = await safeDbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId), Query.limit(500)]);
            const commodityTypes = ctRes.data;
            if (commodityTypes.length === 0) return { success: true, data: [] };
            const [batchesRes, salesRes] = await Promise.all([
                safeDbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId), Query.limit(500)])
            ]);
            const batches = batchesRes.data;
            const salesContracts = salesRes.data;
            const rows: CommodityProfitRow[] = commodityTypes.map((ct: any) => {
                const typeBatches = batches.filter((b: any) => b.commodity_type_id === ct.$id);
                const typeSales = salesContracts.filter((s: any) => s.commodity_type_id === ct.$id);
                const totalPurchasedMT = typeBatches.reduce((s: number, b: any) => s + Number(b.received_weight || 0), 0);
                const procurementCost = typeBatches.reduce((s: number, b: any) => s + Number(b.total_cost || 0), 0);
                const totalSoldMT = typeSales.reduce((s: number, s2: any) => s + Number(s2.contracted_quantity || 0), 0);
                const salesRevenue = typeSales.reduce((s: number, s2: any) => s + Number(s2.total_value || 0), 0);
                const grossProfit = salesRevenue - procurementCost;
                const marginPercent = salesRevenue > 0 ? (grossProfit / salesRevenue) * 100 : 0;
                return { commodityTypeId: ct.$id, commodityName: ct.name, commodityCode: ct.code, totalPurchasedMT: Math.round(totalPurchasedMT * 100) / 100, totalSoldMT: Math.round(totalSoldMT * 100) / 100, procurementCost: Math.round(procurementCost * 100) / 100, salesRevenue: Math.round(salesRevenue * 100) / 100, grossProfit: Math.round(grossProfit * 100) / 100, marginPercent: Math.round(marginPercent * 10) / 10 };
            });
            rows.sort((a, b) => b.grossProfit - a.grossProfit);
            return { success: true, data: rows };
        } catch (error) { return { success: false, error: 'Failed to fetch commodity profit summary' }; }
    }

    async getWarehouseStockReport(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<StockAgingRow[]>> {
        try {
            const batchesRes = await safeDbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId), Query.orderAsc('received_date'), Query.limit(500)]);
            const [ctRes, locRes] = await Promise.all([
                safeDbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.LOCATIONS, [Query.limit(500)])
            ]);
            const ctMap = new Map(ctRes.data.map((c: any) => [c.$id, c.name]));
            const locMap = new Map(locRes.data.map((l: any) => [l.$id, l.name]));
            const now = new Date();
            // Filter in code instead of query to avoid missing attribute errors
            const activeBatches = batchesRes.data.filter((b: any) => Number(b.current_weight || 0) > 0);
            const rows: StockAgingRow[] = activeBatches.map((b: any) => {
                const receivedDate = new Date(b.received_date);
                const ageDays = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
                return { batchId: b.$id, batchNumber: b.batch_number, commodityTypeId: b.commodity_type_id, commodityName: ctMap.get(b.commodity_type_id) || 'Unknown', locationId: b.location_id, locationName: locMap.get(b.location_id) || 'Unknown', currentWeight: Number(b.current_weight), receivedDate: b.received_date, ageDays, grade: b.grade || 'Ungraded', status: b.status };
            });
            return { success: true, data: rows };
        } catch (error) { return { success: false, error: 'Failed to fetch warehouse stock report' }; }
    }

    async getSupplierScorecard(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<SupplierScorecardRow[]>> {
        try {
            const [suppliersRes, contractsRes] = await Promise.all([
                safeDbList(COLLECTIONS.SUPPLIERS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.PURCHASE_CONTRACTS, [Query.equal('company_id', companyId), Query.limit(500)])
            ]);
            // Filter is_active in code to avoid index issues
            const suppliers = suppliersRes.data.filter((s: any) => s.is_active !== false);
            const contracts = contractsRes.data;
            const rows: SupplierScorecardRow[] = suppliers.map((s: any) => {
                const sc = contracts.filter((c: any) => c.supplier_id === s.$id);
                const completed = sc.filter((c: any) => c.status === 'COMPLETED').length;
                const totalVolumeMT = sc.reduce((sum: number, c: any) => sum + Number(c.delivered_quantity || 0), 0);
                const totalVal = sc.reduce((sum: number, c: any) => sum + Number(c.total_value || 0), 0);
                const avgPrice = totalVolumeMT > 0 ? totalVal / totalVolumeMT : 0;
                const fulfillment = sc.length > 0 ? (completed / sc.length) * 100 : 0;
                return { supplierId: s.$id, supplierName: s.name, supplierType: s.type, totalContracts: sc.length, completedContracts: completed, totalVolumeMT: Math.round(totalVolumeMT * 100) / 100, totalPurchaseValue: Math.round(totalVal * 100) / 100, avgPricePerTon: Math.round(avgPrice * 100) / 100, performanceRating: s.performance_rating || 0, fulfillmentRate: Math.round(fulfillment * 10) / 10 };
            });
            rows.sort((a, b) => b.performanceRating - a.performanceRating);
            return { success: true, data: rows };
        } catch (error) { return { success: false, error: 'Failed to fetch supplier scorecard' }; }
    }

    async getProcessingYieldReport(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ProcessingYieldRow[]>> {
        try {
            const ordersRes = await safeDbList(COLLECTIONS.PROCESSING_ORDERS, [Query.equal('company_id', companyId), Query.limit(500)]);
            const orders = ordersRes.data;
            if (orders.length === 0) return { success: true, data: [] };
            const grouped = new Map<string, { total: number; completed: number }>();
            for (const o of orders) {
                const key = (o as any).processing_type || 'UNKNOWN';
                const entry = grouped.get(key) || { total: 0, completed: 0 };
                entry.total++;
                if ((o as any).status === 'COMPLETED') entry.completed++;
                grouped.set(key, entry);
            }
            return { success: true, data: Array.from(grouped.entries()).map(([type, stats]) => ({ processingType: type, totalOrders: stats.total, completedOrders: stats.completed, totalInputMT: 0, totalOutputMT: 0, yieldPercent: 0 })) };
        } catch (error) { return { success: false, error: 'Failed to fetch processing yield report' }; }
    }

    async getBuyerPerformance(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<BuyerPerformanceRow[]>> {
        try {
            const [buyersRes, contractsRes] = await Promise.all([
                safeDbList(COLLECTIONS.BUYERS, [Query.equal('company_id', companyId), Query.limit(500)]),
                safeDbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId), Query.limit(500)])
            ]);
            // Filter is_active in code
            const buyers = buyersRes.data.filter((b: any) => b.is_active !== false);
            const contracts = contractsRes.data;
            const rows: BuyerPerformanceRow[] = buyers.map((b: any) => {
                const bc = contracts.filter((c: any) => c.buyer_id === b.$id);
                const totalContractedMT = bc.reduce((s: number, c: any) => s + Number(c.contracted_quantity || 0), 0);
                const totalShippedMT = bc.reduce((s: number, c: any) => s + Number(c.shipped_quantity || 0), 0);
                const totalVal = bc.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0);
                const fulfillment = totalContractedMT > 0 ? (totalShippedMT / totalContractedMT) * 100 : 0;
                return { buyerId: b.$id, buyerName: b.name, buyerType: b.type, totalContracts: bc.length, totalContractedMT: Math.round(totalContractedMT * 100) / 100, totalShippedMT: Math.round(totalShippedMT * 100) / 100, totalContractValue: Math.round(totalVal * 100) / 100, fulfillmentRate: Math.round(fulfillment * 10) / 10 };
            });
            rows.sort((a, b) => b.totalContractValue - a.totalContractValue);
            return { success: true, data: rows };
        } catch (error) { return { success: false, error: 'Failed to fetch buyer performance' }; }
    }
}
