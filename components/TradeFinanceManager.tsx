import React, { useState, useEffect } from 'react';
import {
    ShieldCheck, Landmark, Calendar,
    FileText, Plus, Search, AlertTriangle,
    ArrowRight, Clock, CheckCircle2
} from 'lucide-react';
import { LetterOfCredit, LetterOfCreditStatus, SalesContract, Buyer, Currency } from '../types_commodity';
import { api } from '../services/api';

interface TradeFinanceManagerProps {
    onAuditLog?: (action: string, details: string) => void;
}

export const TradeFinanceManager: React.FC<TradeFinanceManagerProps> = ({ onAuditLog }) => {
    const [lcs, setLcs] = useState<LetterOfCredit[]>([]);
    const [contracts, setContracts] = useState<SalesContract[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        lcNumber: '',
        salesContractId: '',
        buyerId: '',
        issuingBank: '',
        advisingBank: '',
        amount: '',
        currency: 'USD' as Currency,
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [lcRes, contractRes, buyerRes] = await Promise.all([
            api.tradeFinance.getLettersOfCredit(),
            api.sales.getSalesContracts(),
            api.sales.getBuyers()
        ]);

        if (lcRes.success && lcRes.data) setLcs(lcRes.data);
        if (contractRes.success && contractRes.data) setContracts(contractRes.data);
        if (buyerRes.success && buyerRes.data) setBuyers(buyerRes.data);

        setIsLoading(false);
    };

    const handleCreateLC = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await api.tradeFinance.createLetterOfCredit({
            companyId: '',
            lcNumber: formData.lcNumber,
            salesContractId: formData.salesContractId,
            buyerId: formData.buyerId,
            issuingBank: formData.issuingBank,
            advisingBank: formData.advisingBank,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            issueDate: formData.issueDate,
            expiryDate: formData.expiryDate
        });

        if (res.success) {
            if (onAuditLog) onAuditLog('CREATE_LC', `Created LC ${formData.lcNumber} for contract ${formData.salesContractId}`);
            setShowAddForm(false);
            loadData();
        } else {
            alert(`Error: ${res.error}`);
        }
    };

    const getDaysToExpiry = (expiryDate: string) => {
        const diff = new Date(expiryDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const getBuyerName = (id: string) => buyers.find(b => b.id === id)?.name || 'Unknown Buyer';
    const getContractNumber = (id: string) => contracts.find(c => c.id === id)?.contractNumber || 'Unknown Contract';

    const filteredLcs = lcs.filter(lc =>
        lc.lcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getBuyerName(lc.buyerId).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Trade Finance Integration
                    </h2>
                    <p className="text-slate-500">Manage Letters of Credit and Bank Guarantees</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    {showAddForm ? <Clock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showAddForm ? 'View Active LCs' : 'Register New LC'}
                </button>
            </div>

            {showAddForm ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl mx-auto overflow-hidden">
                    <div className="px-8 py-6 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg">Register Letter of Credit</h3>
                    </div>
                    <form onSubmit={handleCreateLC} className="p-8 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">LC Number *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                    value={formData.lcNumber}
                                    onChange={e => setFormData({ ...formData, lcNumber: e.target.value })}
                                    placeholder="e.g. LC/EXP/2024/001"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Linked Sales Contract *</label>
                                <select
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                    value={formData.salesContractId}
                                    onChange={e => {
                                        const contract = contracts.find(c => c.id === e.target.value);
                                        setFormData({
                                            ...formData,
                                            salesContractId: e.target.value,
                                            buyerId: contract?.buyerId || '',
                                            amount: contract?.totalValue.toString() || '',
                                            currency: (contract?.currency as Currency) || 'USD'
                                        });
                                    }}
                                >
                                    <option value="">Select Contract</option>
                                    {contracts.map(c => (
                                        <option key={c.id} value={c.id}>{c.contractNumber} - {getBuyerName(c.buyerId)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Issuing Bank *</label>
                                <div className="relative">
                                    <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                        value={formData.issuingBank}
                                        onChange={e => setFormData({ ...formData, issuingBank: e.target.value })}
                                        placeholder="Buyer's Bank"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Advising Bank (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                    value={formData.advisingBank}
                                    onChange={e => setFormData({ ...formData, advisingBank: e.target.value })}
                                    placeholder="Local Bank"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">LC Amount *</label>
                                <div className="flex">
                                    <select
                                        className="px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl font-bold"
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value as Currency })}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="NGN">NGN</option>
                                    </select>
                                    <input
                                        type="number"
                                        required
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Issue Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={formData.issueDate}
                                        onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Expiry Date *</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none border-indigo-200 bg-indigo-50/10"
                                        value={formData.expiryDate}
                                        onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-8 py-3 text-slate-600 font-bold hover:text-slate-900 transition-colors"
                            >
                                Discard
                            </button>
                            <button
                                type="submit"
                                className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all"
                            >
                                Save Letter of Credit
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Quick Info & Search */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search LC numbers, buyers, or banks..."
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
                            <span className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest self-center">Status Filters:</span>
                            {['ACTIVE', 'UTILIZED', 'EXPIRED'].map(s => (
                                <button key={s} className="px-3 py-1.5 text-[10px] font-black hover:bg-slate-50 rounded-lg">{s}</button>
                            ))}
                        </div>
                    </div>

                    {/* LCs Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 text-emerald-100/0">
                        {filteredLcs.map(lc => {
                            const daysLeft = getDaysToExpiry(lc.expiryDate);
                            const isWarning = daysLeft < 30 && lc.status === 'ACTIVE';

                            return (
                                <div key={lc.id} className={`bg-white rounded-3xl border ${isWarning ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'} p-6 shadow-sm hover:shadow-md transition-all group`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isWarning ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 leading-tight">{lc.lcNumber}</h4>
                                                <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1">
                                                    {getBuyerName(lc.buyerId)}
                                                </div>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${lc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                lc.status === 'UTILIZED' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {lc.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8 mb-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Value & Currency</p>
                                            <div className="text-2xl font-black text-slate-800">
                                                {lc.currency} {lc.amount.toLocaleString()}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 font-medium italic">Linked to {getContractNumber(lc.salesContractId)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Issuing Entity</p>
                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                <Landmark className="w-4 h-4 text-slate-400" />
                                                {lc.issuingBank}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">Ref: {lc.id.slice(0, 8)}</p>
                                        </div>
                                    </div>

                                    <div className={`p-4 rounded-2xl flex items-center justify-between border ${isWarning ? 'bg-amber-100/50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <Calendar className={`w-4 h-4 ${isWarning ? 'text-amber-600' : 'text-slate-400'}`} />
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Expiry Date</p>
                                                <p className={`text-sm font-black ${isWarning ? 'text-amber-700' : 'text-slate-700'}`}>
                                                    {new Date(lc.expiryDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        {isWarning ? (
                                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                <span className="text-xs font-black text-amber-700">{daysLeft} Days Left</span>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Validity</span>
                                                <p className="text-xs font-bold text-slate-600">{daysLeft} Days Remaining</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                                            View Document Details <ArrowRight className="w-3 h-3" />
                                        </button>
                                        {lc.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => {
                                                    if (window.confirm("Mark this LC as utilized?")) {
                                                        api.tradeFinance.updateLCStatus(lc.id, LetterOfCreditStatus.UTILIZED).then(() => loadData());
                                                    }
                                                }}
                                                className="text-xs font-black text-emerald-600 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                                            >
                                                <CheckCircle2 className="w-3 h-3" /> Mark Utilized
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredLcs.length === 0 && !isLoading && (
                            <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
                                <ShieldCheck className="w-12 h-12 text-slate-200 mb-4" />
                                <h4 className="font-bold text-slate-400 italic">No trade finance instruments found.</h4>
                                <p className="text-sm text-slate-300 mt-1">Start by registering a New Letter of Credit for your contracts.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
