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

export class ReportingService {
    async getDashboardKPIs(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<DashboardKPIs>> {
        try {
            const [batchesRes, pcRes, scRes, qcRes, shipRes, suppRes, buyRes, procRes] = await Promise.all([
                dbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId), Query.greaterThan('current_weight', 0)]),
                dbList(COLLECTIONS.PURCHASE_CONTRACTS, [Query.equal('company_id', companyId)]),
                dbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId)]),
                dbList(COLLECTIONS.QUALITY_TESTS, [Query.equal('company_id', companyId), Query.equal('status', 'PENDING')]),
                dbList(COLLECTIONS.SHIPMENTS, [Query.equal('company_id', companyId), Query.equal('status', 'IN_TRANSIT')]),
                dbList(COLLECTIONS.SUPPLIERS, [Query.equal('company_id', companyId), Query.equal('is_active', true)]),
                dbList(COLLECTIONS.BUYERS, [Query.equal('company_id', companyId), Query.equal('is_active', true)]),
                dbList(COLLECTIONS.PROCESSING_ORDERS, [Query.equal('company_id', companyId), Query.equal('status', 'IN_PROGRESS')])
            ]);
            const batches = batchesRes.data || [];
            const pc = pcRes.data || [];
            const sc = scRes.data || [];
            const totalInventoryWeight = batches.reduce((s: number, b: any) => s + Number(b.current_weight || 0), 0);
            const activePurchaseContracts = pc.filter((c: any) => c.status === 'ACTIVE').length;
            const activeSalesContracts = sc.filter((c: any) => c.status === 'ACTIVE').length;
            const procurementSpend = pc.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0);
            const salesRevenue = sc.reduce((s: number, c: any) => s + Number(c.total_value || 0), 0);
            return {
                success: true, data: {
                    totalInventoryWeight: Math.round(totalInventoryWeight * 100) / 100,
                    activePurchaseContracts, activeSalesContracts,
                    pendingQualityTests: qcRes.data?.length || 0,
                    shipmentsInTransit: shipRes.data?.length || 0,
                    totalSuppliers: suppRes.data?.length || 0,
                    totalBuyers: buyRes.data?.length || 0,
                    procurementSpend, salesRevenue,
                    processingOrdersActive: procRes.data?.length || 0
                }
            };
        } catch (error) { return { success: false, error: 'Failed to fetch dashboard KPIs' }; }
    }

    async getCommodityProfitSummary(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityProfitRow[]>> {
        try {
            const { data: commodityTypes } = await dbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId), Query.equal('is_active', true)]);
            if (!commodityTypes || commodityTypes.length === 0) return { success: true, data: [] };
            const { data: batches } = await dbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId)]);
            const { data: salesContracts } = await dbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId)]);
            const rows: CommodityProfitRow[] = commodityTypes.map((ct: any) => {
                const typeBatches = (batches || []).filter((b: any) => b.commodity_type_id === ct.$id);
                const typeSales = (salesContracts || []).filter((s: any) => s.commodity_type_id === ct.$id);
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
            const { data: batches } = await dbList(COLLECTIONS.COMMODITY_BATCHES, [Query.equal('company_id', companyId), Query.greaterThan('current_weight', 0), Query.orderAsc('received_date')]);
            const [ctRes, locRes] = await Promise.all([
                dbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId)]),
                dbList(COLLECTIONS.LOCATIONS, [])
            ]);
            const ctMap = new Map((ctRes.data || []).map((c: any) => [c.$id, c.name]));
            const locMap = new Map((locRes.data || []).map((l: any) => [l.$id, l.name]));
            const now = new Date();
            const rows: StockAgingRow[] = (batches || []).map((b: any) => {
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
                dbList(COLLECTIONS.SUPPLIERS, [Query.equal('company_id', companyId), Query.equal('is_active', true)]),
                dbList(COLLECTIONS.PURCHASE_CONTRACTS, [Query.equal('company_id', companyId)])
            ]);
            const suppliers = suppliersRes.data || [];
            const contracts = contractsRes.data || [];
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
            const { data: orders } = await dbList(COLLECTIONS.PROCESSING_ORDERS, [Query.equal('company_id', companyId)]);
            if (!orders || orders.length === 0) return { success: true, data: [] };
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
                dbList(COLLECTIONS.BUYERS, [Query.equal('company_id', companyId), Query.equal('is_active', true)]),
                dbList(COLLECTIONS.SALES_CONTRACTS, [Query.equal('company_id', companyId)])
            ]);
            const buyers = buyersRes.data || [];
            const contracts = contractsRes.data || [];
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
