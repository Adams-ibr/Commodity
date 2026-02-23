import React, { useState, useEffect } from 'react';
import {
    Globe, TrendingUp, ArrowLeftRight,
    Plus, Search, RefreshCcw, Save,
    AlertCircle, History, Landmark
} from 'lucide-react';
import { Currency, ExchangeRate } from '../types_commodity';
import { api } from '../services/api';

interface FXManagerProps {
    onAuditLog?: (action: string, details: string) => void;
}

export const FXManager: React.FC<FXManagerProps> = ({ onAuditLog }) => {
    const [rates, setRates] = useState<ExchangeRate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // New Rate Form
    const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
    const [toCurrency, setToCurrency] = useState<Currency>('NGN');
    const [rateValue, setRateValue] = useState<string>('');
    const [rateDate, setRateDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadRates();
    }, []);

    const loadRates = async () => {
        setIsLoading(true);
        const res = await api.fx.getExchangeRates();
        if (res.success && res.data) {
            setRates(res.data);
        }
        setIsLoading(false);
    };

    const handleUpdateRate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rateValue || isNaN(parseFloat(rateValue))) return;

        const res = await api.fx.updateExchangeRate({
            companyId: '', // Set by service
            fromCurrency,
            toCurrency,
            rate: parseFloat(rateValue),
            rateDate,
            source: 'MANUAL',
            isActive: true
        });

        if (res.success) {
            if (onAuditLog) {
                onAuditLog('FX_RATE_UPDATE', `Updated ${fromCurrency}/${toCurrency} rate to ${rateValue}`);
            }
            setShowAddForm(false);
            setRateValue('');
            loadRates();
        } else {
            alert(`Error: ${res.error}`);
        }
    };

    const currencies: Currency[] = ['NGN', 'USD', 'EUR', 'GBP'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-emerald-100/0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Globe className="w-6 h-6 text-indigo-600" />
                        Foreign Exchange Management
                    </h2>
                    <p className="text-slate-500">Monitor and update system exchange rates</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    {showAddForm ? <ArrowLeftRight className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'View All Rates' : 'Update Rate'}
                </button>
            </div>

            {showAddForm ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden max-w-2xl mx-auto">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800">Update National Exchange Rate</h3>
                    </div>
                    <form onSubmit={handleUpdateRate} className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">From Currency</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    value={fromCurrency}
                                    onChange={(e) => setFromCurrency(e.target.value as Currency)}
                                >
                                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">To Currency</label>
                                <select
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    value={toCurrency}
                                    onChange={(e) => setToCurrency(e.target.value as Currency)}
                                >
                                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Rate</label>
                                <div className="relative">
                                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="e.g. 1500.00"
                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        value={rateValue}
                                        onChange={(e) => setRateValue(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-slate-700">Effective Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                    value={rateDate}
                                    onChange={(e) => setRateDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                            <p className="text-sm text-indigo-700">
                                Updating the base rate will affect all new transactions. Historical transactions will maintain the rate captured at the time of entry.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-6 py-2 text-slate-600 font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-2 bg-slate-900 text-white rounded-lg font-bold shadow-lg hover:bg-black transition-all"
                            >
                                Save Rate
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Rates Table */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <History className="w-5 h-5 text-slate-400" />
                                Historical Rate Log
                            </h3>
                            <button onClick={loadRates} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors">
                                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3">Effective Date</th>
                                        <th className="px-6 py-3">Pair</th>
                                        <th className="px-6 py-3 text-right">Rate</th>
                                        <th className="px-6 py-3">Source</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rates.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600">
                                                {new Date(r.rateDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-indigo-600">{r.fromCurrency}</span>
                                                <span className="text-slate-400 mx-1">/</span>
                                                <span className="font-bold text-slate-800">{r.toCurrency}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                                                {r.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                    {r.source}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {rates.length === 0 && !isLoading && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                No exchange rate history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Quick Stats / Live Preview */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200">
                            <div className="flex items-center justify-between mb-8">
                                <Landmark className="w-10 h-10 opacity-50" />
                                <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-bold">LIVE SYSTEM BASE</span>
                            </div>
                            <p className="text-sm font-medium opacity-80 mb-1">Current USD/NGN Base</p>
                            <h4 className="text-4xl font-black mb-6">
                                ₦{rates.find(r => r.fromCurrency === 'USD' && r.toCurrency === 'NGN')?.rate.toLocaleString() || '---'}
                            </h4>
                            <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    +1.2% this week
                                </span>
                                <span className="text-[10px] opacity-60">Source: Central Bank</span>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Currency Quick Map</h3>
                            <div className="space-y-3">
                                {currencies.filter(c => c !== 'NGN').map(c => (
                                    <div key={c} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="font-bold text-slate-600">{c}</span>
                                        <span className="font-mono text-sm font-bold text-indigo-600">
                                            ₦{rates.find(r => r.fromCurrency === c && r.toCurrency === 'NGN')?.rate.toLocaleString() || '---'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
