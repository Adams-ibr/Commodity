import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Calendar,
    ChevronRight, ChevronDown, Calculator,
    ArrowUpRight, ArrowDownRight, Printer,
    RefreshCcw, Loader2, AlertCircle
} from 'lucide-react';
import {
    ProfitLossStatement, BalanceSheet,
    AccountType, Currency
} from '../types_commodity';
import { api } from '../services/api';

interface FinancialReportViewerProps {
    onAuditLog?: (action: string, details: string) => void;
}

export const FinancialReportViewer: React.FC<FinancialReportViewerProps> = ({ onAuditLog }) => {
    const [reportType, setReportType] = useState<'pl' | 'bs' | 'tb'>('pl');
    const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

    const [plData, setPlData] = useState<ProfitLossStatement | null>(null);
    const [bsData, setBsData] = useState<BalanceSheet | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadReport();
    }, [reportType]);

    const loadReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (reportType === 'pl') {
                const res = await api.accounting.getProfitLossStatement(fromDate, toDate);
                if (res.success) setPlData(res.data!);
                else setError(res.error || 'Failed to generate P&L');
            } else if (reportType === 'bs') {
                const res = await api.accounting.getBalanceSheet(asOfDate);
                if (res.success) setBsData(res.data!);
                else setError(res.error || 'Failed to generate Balance Sheet');
            }
        } catch (err) {
            setError('An unexpected error occurred while generating the report.');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    const renderPL = () => {
        if (!plData) return null;

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Revenue Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                        <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Revenue</h3>
                        <span className="text-sm font-medium text-slate-400">Operating Income</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {plData.revenue.map((line) => (
                            <div key={line.accountCode} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-slate-400">{line.accountCode}</span>
                                    <span className="font-medium text-slate-600">{line.accountName}</span>
                                </div>
                                <span className="font-semibold text-slate-800">{formatCurrency(line.amount)}</span>
                            </div>
                        ))}
                        <div className="py-4 flex items-center justify-between bg-slate-50/50 px-4 rounded-lg mt-2 font-bold text-slate-900 border-t border-slate-200">
                            <span>Total Revenue</span>
                            <span>{formatCurrency(plData.totalRevenue)}</span>
                        </div>
                    </div>
                </section>

                {/* Expenses Section */}
                <section className="space-y-4 text-emerald-100/0">
                    <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                        <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Expenses</h3>
                        <span className="text-sm font-medium text-slate-400">Operating Costs</span>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {plData.expenses.map((line) => (
                            <div key={line.accountCode} className="py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-slate-400">{line.accountCode}</span>
                                    <span className="font-medium text-slate-600">{line.accountName}</span>
                                </div>
                                <span className="font-semibold text-slate-800">{formatCurrency(line.amount)}</span>
                            </div>
                        ))}
                        <div className="py-4 flex items-center justify-between bg-slate-50/50 px-4 rounded-lg mt-2 font-bold text-slate-900 border-t border-slate-200">
                            <span>Total Expenses</span>
                            <span>{formatCurrency(plData.totalExpenses)}</span>
                        </div>
                    </div>
                </section>

                {/* Net Profit Summary */}
                <div className={`p-6 rounded-2xl border-2 flex items-center justify-between transition-all shadow-sm
          ${plData.netProfit >= 0
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                        : 'bg-rose-50 border-rose-100 text-rose-900'}`}>
                    <div>
                        <p className="text-sm font-bold uppercase tracking-widest opacity-70">Net Income / (Loss)</p>
                        <h4 className="text-3xl font-black mt-1">
                            {formatCurrency(plData.netProfit)}
                        </h4>
                    </div>
                    <div className={`p-4 rounded-xl ${plData.netProfit >= 0 ? 'bg-emerald-200/50' : 'bg-rose-200/50'}`}>
                        {plData.netProfit >= 0 ? <ArrowUpRight className="w-8 h-8" /> : <ArrowDownRight className="w-8 h-8" />}
                    </div>
                </div>
            </div>
        );
    };

    const renderBS = () => {
        if (!bsData) return null;

        const renderSection = (title: string, data: any, color: string) => (
            <section className="space-y-4">
                <div className={`flex items-center justify-between border-b-2 ${color} pb-2`}>
                    <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wider">{title}</h3>
                </div>
                <div className="divide-y divide-slate-50">
                    {data.items.map((line: any) => (
                        <div key={line.accountCode} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-slate-400">{line.accountCode}</span>
                                <span className="font-medium text-slate-600">{line.accountName}</span>
                            </div>
                            <span className="font-semibold text-slate-800">{formatCurrency(line.amount)}</span>
                        </div>
                    ))}
                    <div className="py-4 flex items-center justify-between bg-slate-50/50 px-4 rounded-lg mt-2 font-bold text-slate-900 border-t border-slate-200">
                        <span>Total {title}</span>
                        <span>{formatCurrency(data.total)}</span>
                    </div>
                </div>
            </section>
        );

        return (
            <div className="space-y-12 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-12">
                        {renderSection('Assets', bsData.assets, 'border-emerald-100')}
                    </div>
                    <div className="space-y-12">
                        {renderSection('Liabilities', bsData.liabilities, 'border-rose-100')}
                        {renderSection('Equity', bsData.equity, 'border-indigo-100')}

                        <div className="p-4 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 flex items-center justify-between">
                            <span className="font-bold">Total Liabilities & Equity</span>
                            <span className="text-xl font-black">{formatCurrency(bsData.totalLiabilitiesAndEquity)}</span>
                        </div>
                    </div>
                </div>

                {/* Balance Check */}
                {Math.abs(bsData.totalAssets - bsData.totalLiabilitiesAndEquity) > 0.01 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium">Warning: Balance sheet is out of sync by {formatCurrency(Math.abs(bsData.totalAssets - bsData.totalLiabilitiesAndEquity))}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8">
            {/* Header & Type Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                        onClick={() => setReportType('pl')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all
              ${reportType === 'pl' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Profit & Loss
                    </button>
                    <button
                        onClick={() => setReportType('bs')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all
              ${reportType === 'bs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Balance Sheet
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    {reportType === 'pl' ? (
                        <>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-transparent border-none text-sm font-semibold outline-none text-slate-700"
                                />
                            </div>
                            <span className="text-slate-400 font-bold">to</span>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-transparent border-none text-sm font-semibold outline-none text-slate-700"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                className="bg-transparent border-none text-sm font-semibold outline-none text-slate-700"
                            />
                        </div>
                    )}

                    <button
                        onClick={loadReport}
                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>

                    <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block"></div>

                    <button
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-sm transition-colors border border-slate-200"
                    >
                        <Download className="w-4 h-4" />
                        XLSX
                    </button>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-lg font-bold text-sm transition-colors shadow-lg"
                    >
                        <Printer className="w-4 h-4" />
                        PDF Report
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 min-h-[600px] relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-3xl">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                        <p className="text-slate-500 font-bold animate-pulse">Generating your financial intelligence...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center">
                        <div className="p-4 bg-rose-100 rounded-full mb-6">
                            <AlertCircle className="w-12 h-12 text-rose-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Report Generation Failed</h3>
                        <p className="text-slate-500 mt-2 max-w-sm">{error}</p>
                        <button
                            onClick={loadReport}
                            className="mt-8 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-12 text-center">
                            <h1 className="text-3xl font-black text-slate-900 uppercase">
                                {reportType === 'pl' ? 'Profit & Loss Statement' : 'Balance Sheet'}
                            </h1>
                            <p className="text-slate-400 font-medium mt-2">
                                {reportType === 'pl'
                                    ? `For the period ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`
                                    : `As of ${new Date(asOfDate).toLocaleDateString()}`
                                }
                            </p>
                        </div>
                        {reportType === 'pl' ? renderPL() : renderBS()}
                    </>
                )}
            </div>
        </div>
    );
};
