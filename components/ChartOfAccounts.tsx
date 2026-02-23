import React, { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2,
    ChevronRight, ChevronDown, BookOpen,
    ArrowUpRight, ArrowDownRight, RefreshCcw
} from 'lucide-react';
import { Account, AccountType } from '../types_commodity';
import { api } from '../services/api';

interface ChartOfAccountsProps {
    onAuditLog?: (action: string, details: string) => void;
}

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ onAuditLog }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(new Set(Object.values(AccountType)));

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setIsLoading(true);
        const res = await api.accounting.getAccounts();
        if (res.success && res.data) {
            setAccounts(res.data);
        }
        setIsLoading(false);
    };

    const toggleType = (type: AccountType) => {
        const newExpanded = new Set(expandedTypes);
        if (newExpanded.has(type)) {
            newExpanded.delete(type);
        } else {
            newExpanded.add(type);
        }
        setExpandedTypes(newExpanded);
    };

    const getAccountsByType = (type: AccountType) => {
        return accounts.filter(a => a.accountType === type &&
            (a.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.accountCode.includes(searchTerm)));
    };

    const getTypeColor = (type: AccountType) => {
        switch (type) {
            case AccountType.ASSET: return 'bg-emerald-100 text-emerald-700';
            case AccountType.LIABILITY: return 'bg-rose-100 text-rose-700';
            case AccountType.EQUITY: return 'bg-indigo-100 text-indigo-700';
            case AccountType.REVENUE: return 'bg-blue-100 text-blue-700';
            case AccountType.EXPENSE: return 'bg-amber-100 text-amber-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Chart of Accounts</h2>
                    <p className="text-slate-500">Manage your company's financial structure</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={loadAccounts}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => alert('Add Account Modal coming soon...')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Account
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by name or code..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="space-y-4">
                {Object.values(AccountType).map((type) => {
                    const typeAccounts = getAccountsByType(type);
                    const isExpanded = expandedTypes.has(type);

                    if (searchTerm && typeAccounts.length === 0) return null;

                    return (
                        <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <button
                                onClick={() => toggleType(type)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getTypeColor(type)}`}>
                                        {type}
                                    </span>
                                    <span className="font-semibold text-slate-700">{type} Accounts</span>
                                    <span className="text-sm text-slate-400">({typeAccounts.length})</span>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                            </button>

                            {isExpanded && (
                                <div className="divide-y divide-slate-50">
                                    {typeAccounts.map((account) => (
                                        <div key={account.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 text-sm font-mono font-bold text-slate-400">
                                                    {account.accountCode}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-800">{account.accountName}</p>
                                                    <p className="text-xs text-slate-500">{account.accountSubtype || 'General'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {typeAccounts.length === 0 && (
                                        <div className="px-6 py-8 text-center text-slate-400 italic">
                                            No {type.toLowerCase()} accounts found.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
