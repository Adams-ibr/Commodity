import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, Package, TrendingUp, TrendingDown, Users, Truck,
    ClipboardCheck, Factory, DollarSign, Calendar, RefreshCw,
    ArrowUpRight, ArrowDownRight, Layers, ShoppingCart, Beaker
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import {
    DashboardKPIs, CommodityProfitRow, StockAgingRow,
    SupplierScorecardRow, ProcessingYieldRow, BuyerPerformanceRow
} from '../services/reportingService';

interface AnalyticsDashboardProps {
    userRole: UserRole;
    userName: string;
    onAuditLog?: (action: string, details: string) => void;
}

// Color palette for charts
const CHART_COLORS = [
    '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16'
];

const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
    return `₦${amount.toLocaleString()}`;
};

const formatWeight = (mt: number): string => {
    if (mt >= 1_000) return `${(mt / 1_000).toFixed(1)}K MT`;
    return `${mt.toFixed(1)} MT`;
};

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
    userRole,
    userName,
    onAuditLog
}) => {
    const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
    const [commodityProfit, setCommodityProfit] = useState<CommodityProfitRow[]>([]);
    const [stockAging, setStockAging] = useState<StockAgingRow[]>([]);
    const [supplierScores, setSupplierScores] = useState<SupplierScorecardRow[]>([]);
    const [processingYield, setProcessingYield] = useState<ProcessingYieldRow[]>([]);
    const [buyerPerformance, setBuyerPerformance] = useState<BuyerPerformanceRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState<'overview' | 'stock' | 'suppliers' | 'buyers' | 'processing'>('overview');

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            const [kpiRes, profitRes, stockRes, supplierRes, yieldRes, buyerRes] = await Promise.all([
                api.reporting.getDashboardKPIs(),
                api.reporting.getCommodityProfitSummary(),
                api.reporting.getWarehouseStockReport(),
                api.reporting.getSupplierScorecard(),
                api.reporting.getProcessingYieldReport(),
                api.reporting.getBuyerPerformance()
            ]);

            if (kpiRes.success && kpiRes.data) setKpis(kpiRes.data);
            if (profitRes.success && profitRes.data) setCommodityProfit(profitRes.data);
            if (stockRes.success && stockRes.data) setStockAging(stockRes.data);
            if (supplierRes.success && supplierRes.data) setSupplierScores(supplierRes.data);
            if (yieldRes.success && yieldRes.data) setProcessingYield(yieldRes.data);
            if (buyerRes.success && buyerRes.data) setBuyerPerformance(buyerRes.data);
        } catch (error) {
            console.error('Failed to load analytics data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Stock aging summary
    const stockAgingSummary = useMemo(() => {
        const fresh = stockAging.filter(s => s.ageDays <= 30);
        const aging = stockAging.filter(s => s.ageDays > 30 && s.ageDays <= 60);
        const old = stockAging.filter(s => s.ageDays > 60);
        return { fresh, aging, old };
    }, [stockAging]);

    const getAgingColor = (days: number) => {
        if (days <= 30) return 'text-emerald-700 bg-emerald-50';
        if (days <= 60) return 'text-amber-700 bg-amber-50';
        return 'text-red-700 bg-red-50';
    };

    const getAgingBadge = (days: number) => {
        if (days <= 30) return 'bg-emerald-100 text-emerald-800';
        if (days <= 60) return 'bg-amber-100 text-amber-800';
        return 'bg-red-100 text-red-800';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Analytics Dashboard</h1>
                    <p className="text-slate-500 mt-1">Welcome back, {userName}. Here's your business overview.</p>
                </div>
                <button
                    onClick={loadAllData}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* KPI Cards */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <KPICard
                        icon={Package}
                        label="Total Stock"
                        value={formatWeight(kpis.totalInventoryWeight)}
                        color="indigo"
                    />
                    <KPICard
                        icon={ShoppingCart}
                        label="Active Purchase Contracts"
                        value={String(kpis.activePurchaseContracts)}
                        color="blue"
                    />
                    <KPICard
                        icon={TrendingUp}
                        label="Active Sales Contracts"
                        value={String(kpis.activeSalesContracts)}
                        color="emerald"
                    />
                    <KPICard
                        icon={Beaker}
                        label="Pending QC Tests"
                        value={String(kpis.pendingQualityTests)}
                        color="amber"
                    />
                    <KPICard
                        icon={Truck}
                        label="In Transit"
                        value={String(kpis.shipmentsInTransit)}
                        color="cyan"
                    />
                    <KPICard
                        icon={Users}
                        label="Suppliers"
                        value={String(kpis.totalSuppliers)}
                        color="violet"
                    />
                    <KPICard
                        icon={Users}
                        label="Buyers"
                        value={String(kpis.totalBuyers)}
                        color="pink"
                    />
                    <KPICard
                        icon={DollarSign}
                        label="Procurement Spend"
                        value={formatCurrency(kpis.procurementSpend)}
                        color="red"
                    />
                    <KPICard
                        icon={DollarSign}
                        label="Sales Revenue"
                        value={formatCurrency(kpis.salesRevenue)}
                        color="emerald"
                    />
                    <KPICard
                        icon={Factory}
                        label="Processing Active"
                        value={String(kpis.processingOrdersActive)}
                        color="orange"
                    />
                </div>
            )}

            {/* Section Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                {([
                    { id: 'overview', label: 'Commodity Profit' },
                    { id: 'stock', label: 'Stock Aging' },
                    { id: 'suppliers', label: 'Supplier Scorecard' },
                    { id: 'buyers', label: 'Buyer Performance' },
                    { id: 'processing', label: 'Processing Yield' },
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Commodity Profit */}
            {activeSection === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Profit by Commodity</h3>
                        {commodityProfit.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={commodityProfit}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="commodityCode" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                                    <Tooltip
                                        formatter={(value: number) => [`₦${value.toLocaleString()}`, '']}
                                        labelFormatter={(label) => `Commodity: ${label}`}
                                    />
                                    <Bar dataKey="procurementCost" fill="#ef4444" name="Cost" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="salesRevenue" fill="#10b981" name="Revenue" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState message="No commodity data available yet" />
                        )}
                    </div>

                    {/* Profit Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">Profit Analysis</h3>
                        {commodityProfit.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b border-slate-200">
                                            <th className="pb-3 font-semibold text-slate-500">Commodity</th>
                                            <th className="pb-3 font-semibold text-slate-500 text-right">Revenue</th>
                                            <th className="pb-3 font-semibold text-slate-500 text-right">Cost</th>
                                            <th className="pb-3 font-semibold text-slate-500 text-right">Profit</th>
                                            <th className="pb-3 font-semibold text-slate-500 text-right">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {commodityProfit.map(row => (
                                            <tr key={row.commodityTypeId} className="hover:bg-slate-50">
                                                <td className="py-3">
                                                    <div className="font-medium text-slate-800">{row.commodityName}</div>
                                                    <div className="text-xs text-slate-400">{row.commodityCode}</div>
                                                </td>
                                                <td className="py-3 text-right text-emerald-600 font-medium">{formatCurrency(row.salesRevenue)}</td>
                                                <td className="py-3 text-right text-red-600">{formatCurrency(row.procurementCost)}</td>
                                                <td className="py-3 text-right font-bold">
                                                    <span className={row.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                                        {formatCurrency(row.grossProfit)}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${row.marginPercent >= 20 ? 'bg-emerald-100 text-emerald-800' :
                                                            row.marginPercent >= 0 ? 'bg-amber-100 text-amber-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {row.marginPercent >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                                        {row.marginPercent.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState message="No profit data available yet" />
                        )}
                    </div>
                </div>
            )}

            {/* Stock Aging */}
            {activeSection === 'stock' && (
                <div className="space-y-6">
                    {/* Aging summary cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 text-center">
                            <div className="text-3xl font-bold text-emerald-700">{stockAgingSummary.fresh.length}</div>
                            <div className="text-sm text-emerald-600 mt-1">Fresh (≤ 30 days)</div>
                            <div className="text-xs text-emerald-500 mt-1">
                                {formatWeight(stockAgingSummary.fresh.reduce((s, r) => s + r.currentWeight, 0))}
                            </div>
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-center">
                            <div className="text-3xl font-bold text-amber-700">{stockAgingSummary.aging.length}</div>
                            <div className="text-sm text-amber-600 mt-1">Aging (31–60 days)</div>
                            <div className="text-xs text-amber-500 mt-1">
                                {formatWeight(stockAgingSummary.aging.reduce((s, r) => s + r.currentWeight, 0))}
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-200 p-5 text-center">
                            <div className="text-3xl font-bold text-red-700">{stockAgingSummary.old.length}</div>
                            <div className="text-sm text-red-600 mt-1">Old (60+ days)</div>
                            <div className="text-xs text-red-500 mt-1">
                                {formatWeight(stockAgingSummary.old.reduce((s, r) => s + r.currentWeight, 0))}
                            </div>
                        </div>
                    </div>

                    {/* Stock table */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Batch</th>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Commodity</th>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Location</th>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Weight (MT)</th>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Grade</th>
                                        <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Age</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {stockAging.length > 0 ? stockAging.map(row => (
                                        <tr key={row.batchId} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 font-medium text-indigo-700">{row.batchNumber}</td>
                                            <td className="px-6 py-3 text-slate-700">{row.commodityName}</td>
                                            <td className="px-6 py-3 text-slate-600">{row.locationName}</td>
                                            <td className="px-6 py-3 text-right font-medium text-slate-800">{row.currentWeight.toFixed(1)}</td>
                                            <td className="px-6 py-3">
                                                <span className="inline-flex px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700">{row.grade}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${getAgingBadge(row.ageDays)}`}>
                                                    {row.ageDays}d
                                                </span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No stock data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Supplier Scorecard */}
            {activeSection === 'suppliers' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Supplier</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Type</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Contracts</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Volume (MT)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Avg Price/MT</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Fulfillment</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Rating</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {supplierScores.length > 0 ? supplierScores.map(row => (
                                    <tr key={row.supplierId} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800">{row.supplierName}</td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                {row.supplierType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-700">{row.totalContracts}</td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-800">{row.totalVolumeMT.toFixed(1)}</td>
                                        <td className="px-6 py-3 text-right text-slate-700">{formatCurrency(row.avgPricePerTon)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${row.fulfillmentRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                                    row.fulfillmentRate >= 50 ? 'bg-amber-100 text-amber-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {row.fulfillmentRate.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <RatingStars rating={row.performanceRating} />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No supplier data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Buyer Performance */}
            {activeSection === 'buyers' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Buyer</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase">Type</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Contracts</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Contracted (MT)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Shipped (MT)</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Contract Value</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase text-right">Fulfillment</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {buyerPerformance.length > 0 ? buyerPerformance.map(row => (
                                    <tr key={row.buyerId} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 font-medium text-slate-800">{row.buyerName}</td>
                                        <td className="px-6 py-3">
                                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                                                {row.buyerType}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-700">{row.totalContracts}</td>
                                        <td className="px-6 py-3 text-right text-slate-700">{row.totalContractedMT.toFixed(1)}</td>
                                        <td className="px-6 py-3 text-right font-medium text-slate-800">{row.totalShippedMT.toFixed(1)}</td>
                                        <td className="px-6 py-3 text-right font-medium text-emerald-700">{formatCurrency(row.totalContractValue)}</td>
                                        <td className="px-6 py-3 text-right">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${row.fulfillmentRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                                                    row.fulfillmentRate >= 50 ? 'bg-amber-100 text-amber-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {row.fulfillmentRate.toFixed(0)}%
                                            </span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">No buyer data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Processing Yield */}
            {activeSection === 'processing' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processingYield.length > 0 ? processingYield.map(row => (
                        <div key={row.processingType} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-800">{row.processingType.replace('_', ' ')}</h3>
                                <Factory className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Total Orders</span>
                                    <span className="font-bold text-slate-800">{row.totalOrders}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Completed</span>
                                    <span className="font-bold text-emerald-700">{row.completedOrders}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-indigo-500 h-2 rounded-full transition-all"
                                        style={{ width: `${row.totalOrders > 0 ? (row.completedOrders / row.totalOrders) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-400 text-right">
                                    {row.totalOrders > 0 ? ((row.completedOrders / row.totalOrders) * 100).toFixed(0) : 0}% completion rate
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center text-slate-400 border border-dashed rounded-xl border-slate-300">
                            <Factory className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p>No processing data available yet</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Helper Sub-components ─────────────────────────────

const KPICard: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string;
    color: string;
}> = ({ icon: Icon, label, value, color }) => {
    const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
        blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
        cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
        violet: { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
        pink: { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-200' },
        red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
        orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
    };
    const c = colorMap[color] || colorMap.indigo;

    return (
        <div className={`${c.bg} rounded-xl border ${c.border} p-4 transition-shadow hover:shadow-md`}>
            <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${c.icon}`} />
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
        </div>
    );
};

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => {
    const maxStars = 5;
    const filled = Math.min(Math.round(rating), maxStars);
    return (
        <div className="flex gap-0.5 justify-end">
            {Array.from({ length: maxStars }).map((_, i) => (
                <span key={i} className={`text-sm ${i < filled ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
            ))}
        </div>
    );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <BarChart3 className="w-12 h-12 mb-3 text-slate-300" />
        <p>{message}</p>
    </div>
);
