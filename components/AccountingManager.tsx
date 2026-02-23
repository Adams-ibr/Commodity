import React, { useState, useEffect } from 'react';
import {
    Calculator, History, Book,
    Search, Filter, Plus,
    ArrowUpRight, ArrowDownRight,
    FileSpreadsheet, Loader2, RefreshCcw
} from 'lucide-react';
import { JournalEntry, AccountType, TrialBalance } from '../types_commodity';
import { api } from '../services/api';
import { ChartOfAccounts } from './ChartOfAccounts';
import { JournalEntryForm } from './JournalEntryForm';
import { FinancialReportViewer } from './FinancialReportViewer';
import { FXManager } from './FXManager';

interface AccountingManagerProps {
    userRole: string;
    onAuditLog?: (action: string, details: string) => void;
}

export const AccountingManager: React.FC<AccountingManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [activeTab, setActiveTab] = useState<'journal' | 'accounts' | 'ledger' | 'reports' | 'fx'>('journal');
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [tbData, setTbData] = useState<TrialBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (activeTab === 'journal') {
            loadEntries();
        } else if (activeTab === 'ledger') {
            loadTrialBalance();
        }
    }, [activeTab, asOfDate]);

    const loadEntries = async () => {
        setIsLoading(true);
        const res = await api.accounting.getJournalEntries();
        if (res.success && res.data) {
            setEntries(res.data);
        }
        setIsLoading(false);
    };

    const loadTrialBalance = async () => {
        setIsLoading(true);
        const res = await api.accounting.getTrialBalance(asOfDate);
        if (res.success && res.data) {
            setTbData(res.data);
        }
        setIsLoading(false);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'POSTED': return 'bg-emerald-100 text-emerald-700';
            case 'DRAFT': return 'bg-amber-100 text-amber-700';
            case 'REVERSED': return 'bg-rose-100 text-rose-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const renderJournal = () => {
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Journal Entries</h2>
                        <p className="text-slate-500">Record and manage financial transactions</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        New Entry
                    </button>
                </div>

                {showCreateForm ? (
                    <JournalEntryForm
                        onCancel={() => setShowCreateForm(false)}
                        onSuccess={() => {
                            setShowCreateForm(false);
                            loadEntries();
                        }}
                        onAuditLog={onAuditLog}
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search entries..."
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                    <Filter className="w-4 h-4" />
                                    Filter
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Export
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Reference</th>
                                        <th className="px-6 py-3">Description</th>
                                        <th className="px-6 py-3 text-right">Debit</th>
                                        <th className="px-6 py-3 text-right">Credit</th>
                                        <th className="px-6 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center">
                                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                                                <span className="text-slate-400">Loading entries...</span>
                                            </td>
                                        </tr>
                                    ) : entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                No transactions found.
                                            </td>
                                        </tr>
                                    ) : entries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {new Date(entry.entryDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-indigo-600">
                                                {entry.entryNumber}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                                                {entry.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800">
                                                {entry.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-800">
                                                {entry.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${getStatusColor(entry.status)}`}>
                                                    {entry.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTrialBalance = () => {
        if (isLoading) {
            return (
                <div className="p-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                    <span className="text-slate-400">Loading trial balance...</span>
                </div>
            );
        }
        if (!tbData) return <div className="p-12 text-center text-slate-400">No data available.</div>;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Trial Balance</h2>
                        <p className="text-slate-500">Unadjusted balances as of {new Date(tbData.asOfDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                        />
                        <button onClick={loadTrialBalance} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200">
                            <RefreshCcw className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="px-6 py-3">Code</th>
                                <th className="px-6 py-3">Account Name</th>
                                <th className="px-6 py-3 text-right">Debit</th>
                                <th className="px-6 py-3 text-right">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tbData.accounts.map((acc) => (
                                <tr key={acc.accountCode} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-400">{acc.accountCode}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{acc.accountName}</td>
                                    <td className="px-6 py-4 text-sm text-right text-slate-900">
                                        {acc.debitBalance > 0 ? acc.debitBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-right text-slate-900">
                                        {acc.creditBalance > 0 ? acc.creditBalance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50">
                            <tr className="font-bold text-slate-900">
                                <td colSpan={2} className="px-6 py-4 uppercase tracking-wider text-xs">Total</td>
                                <td className="px-6 py-4 text-right border-t-2 border-slate-900 underline decoration-double">
                                    {tbData.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-6 py-4 text-right border-t-2 border-slate-900 underline decoration-double">
                                    {tbData.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center gap-1 w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('journal')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'journal' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <History className="w-4 h-4" />
                    General Journal
                </button>
                <button
                    onClick={() => setActiveTab('accounts')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Book className="w-4 h-4" />
                    Accounts
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <FileSpreadsheet className="w-4 h-4" />
                    Financial Reports
                </button>
                <button
                    onClick={() => setActiveTab('ledger')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Calculator className="w-4 h-4" />
                    Trial Balance
                </button>
                <button
                    onClick={() => setActiveTab('fx')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'fx' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ArrowUpRight className="w-4 h-4" /> {/* Using ArrowUpRight as a placeholder icon */}
                    FX Manager
                </button>
            </div>

            <div>
                {activeTab === 'journal' && renderJournal()}
                {activeTab === 'accounts' && <ChartOfAccounts onAuditLog={onAuditLog} />}
                {activeTab === 'reports' && <FinancialReportViewer onAuditLog={onAuditLog} />}
                {activeTab === 'ledger' && renderTrialBalance()}
                {activeTab === 'fx' && <FXManager onAuditLog={onAuditLog} />}
            </div>
        </div>
    );
};
