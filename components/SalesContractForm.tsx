import React, { useState, useEffect } from 'react';
import { X, Save, FileText, User, ShoppingCart } from 'lucide-react';
import { SalesContract, Buyer, CommodityType, ContractStatus, Currency } from '../types_commodity';
import { api } from '../services/api';

interface SalesContractFormProps {
    contract?: SalesContract;
    buyers: Buyer[];
    commodityTypes: CommodityType[];
    onSave: (contract: Omit<SalesContract, 'id' | 'createdAt' | 'updatedAt' | 'contractNumber' | 'status'> | SalesContract) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const SalesContractForm: React.FC<SalesContractFormProps> = ({
    contract,
    buyers,
    commodityTypes,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        buyerId: '',
        commodityTypeId: '',
        contractDate: new Date().toISOString().split('T')[0],
        shipmentPeriodStart: '',
        shipmentPeriodEnd: '',
        contractedQuantity: '',
        pricePerTon: '',
        currency: 'USD' as Currency,
        paymentTerms: '',
        incoterms: '',
        destinationPort: '',
    });

    const [equivalentNGN, setEquivalentNGN] = useState<number>(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        updateEquivalent();
    }, [formData.pricePerTon, formData.contractedQuantity, formData.currency]);

    const updateEquivalent = async () => {
        const amount = (Number(formData.contractedQuantity) || 0) * (Number(formData.pricePerTon) || 0);
        if (formData.currency === 'NGN') {
            setEquivalentNGN(amount);
        } else {
            const converted = await api.fx.convertAmount(amount, formData.currency, 'NGN');
            setEquivalentNGN(converted);
        }
    };

    useEffect(() => {
        if (contract) {
            setFormData({
                buyerId: contract.buyerId,
                commodityTypeId: contract.commodityTypeId,
                contractDate: contract.contractDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                shipmentPeriodStart: contract.shipmentPeriodStart?.split('T')[0] || '',
                shipmentPeriodEnd: contract.shipmentPeriodEnd?.split('T')[0] || '',
                contractedQuantity: contract.contractedQuantity.toString(),
                pricePerTon: contract.pricePerTon.toString(),
                currency: contract.currency as Currency,
                paymentTerms: contract.paymentTerms || '',
                incoterms: contract.incoterms || '',
                destinationPort: contract.destinationPort || '',
            });
        }
    }, [contract]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.buyerId) newErrors.buyerId = 'Buyer is required';
        if (!formData.commodityTypeId) newErrors.commodityTypeId = 'Commodity type is required';

        const qty = Number(formData.contractedQuantity);
        if (!formData.contractedQuantity || isNaN(qty) || qty <= 0) {
            newErrors.contractedQuantity = 'Valid quantity is required';
        }

        const price = Number(formData.pricePerTon);
        if (!formData.pricePerTon || isNaN(price) || price < 0) {
            newErrors.pricePerTon = 'Valid price is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const quantity = Number(formData.contractedQuantity);
        const price = Number(formData.pricePerTon);
        const totalValue = quantity * price;

        const contractData: any = {
            ...(contract && { id: contract.id }),
            buyerId: formData.buyerId,
            commodityTypeId: formData.commodityTypeId,
            contractDate: formData.contractDate,
            shipmentPeriodStart: formData.shipmentPeriodStart || undefined,
            shipmentPeriodEnd: formData.shipmentPeriodEnd || undefined,
            contractedQuantity: quantity,
            shippedQuantity: contract?.shippedQuantity || 0,
            pricePerTon: price,
            totalValue,
            currency: formData.currency,
            paymentTerms: formData.paymentTerms || undefined,
            incoterms: formData.incoterms || undefined,
            destinationPort: formData.destinationPort || undefined,
        };

        onSave(contractData);
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100">
                            <ShoppingCart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {contract ? 'Edit Sales Contract' : 'New Sales Contract'}
                            </h2>
                            <p className="text-slate-500 text-sm font-medium">Record a new outbound commodity trade</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <form id="sales-contract-form" onSubmit={handleSubmit} className="space-y-10">

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left Column: Parties & Meta */}
                            <div className="space-y-8">
                                <section className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        Trading Parties
                                    </h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Select Buyer *</label>
                                            <select
                                                value={formData.buyerId}
                                                onChange={(e) => handleInputChange('buyerId', e.target.value)}
                                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all ${errors.buyerId ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                                                    }`}
                                            >
                                                <option value="">Choose a buyer...</option>
                                                {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                            {errors.buyerId && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.buyerId}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Commodity Strategy *</label>
                                            <select
                                                value={formData.commodityTypeId}
                                                onChange={(e) => handleInputChange('commodityTypeId', e.target.value)}
                                                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all ${errors.commodityTypeId ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                                                    }`}
                                            >
                                                <option value="">Select commodity type...</option>
                                                {commodityTypes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                                            </select>
                                            {errors.commodityTypeId && <p className="mt-1.5 text-xs font-bold text-rose-500">{errors.commodityTypeId}</p>}
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Logistics & Terms
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Incoterms (e.g. FOB, CIF)</label>
                                            <input
                                                type="text"
                                                value={formData.incoterms}
                                                onChange={(e) => handleInputChange('incoterms', e.target.value.toUpperCase())}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Destination Port</label>
                                            <input
                                                type="text"
                                                value={formData.destinationPort}
                                                onChange={(e) => handleInputChange('destinationPort', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Contract Date</label>
                                            <input
                                                type="date"
                                                value={formData.contractDate}
                                                onChange={(e) => handleInputChange('contractDate', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Shipment Start</label>
                                            <input
                                                type="date"
                                                value={formData.shipmentPeriodStart}
                                                onChange={(e) => handleInputChange('shipmentPeriodStart', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Shipment End</label>
                                            <input
                                                type="date"
                                                value={formData.shipmentPeriodEnd}
                                                onChange={(e) => handleInputChange('shipmentPeriodEnd', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Right Column: Pricing & Financials */}
                            <div className="space-y-8 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                                <section className="space-y-6">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pricing & Currencies</h3>

                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                                                <select
                                                    value={formData.currency}
                                                    onChange={(e) => handleInputChange('currency', e.target.value as Currency)}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold"
                                                >
                                                    <option value="USD">USD - US Dollar</option>
                                                    <option value="NGN">NGN - Naira</option>
                                                    <option value="EUR">EUR - Euro</option>
                                                    <option value="GBP">GBP - Pound</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-slate-700 mb-2">Quantity (MT)</label>
                                                <input
                                                    type="number"
                                                    value={formData.contractedQuantity}
                                                    onChange={(e) => handleInputChange('contractedQuantity', e.target.value)}
                                                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none transition-all ${errors.contractedQuantity ? 'border-rose-300' : 'border-slate-200'
                                                        }`}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Price Per Ton ({formData.currency})</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.pricePerTon}
                                                onChange={(e) => handleInputChange('pricePerTon', e.target.value)}
                                                className={`w-full px-4 py-4 bg-white border text-xl font-black rounded-xl outline-none transition-all ${errors.pricePerTon ? 'border-rose-300' : 'border-slate-200'
                                                    }`}
                                            />
                                        </div>

                                        <div className="p-6 bg-slate-900 rounded-2xl text-white shadow-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Total Contract Value</span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/10 rounded-full">{formData.currency} Basis</span>
                                            </div>
                                            <div className="text-3xl font-black">
                                                {formData.currency} {((Number(formData.contractedQuantity) || 0) * (Number(formData.pricePerTon) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            {formData.currency !== 'NGN' && (
                                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                                    <span className="text-xs font-bold text-indigo-300 uppercase italic">Local Equivalent</span>
                                                    <span className="text-sm font-black text-emerald-400">
                                                        ₦ {equivalentNGN.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Payment Terms (e.g. LC, CAD)</label>
                                    <textarea
                                        rows={3}
                                        value={formData.paymentTerms}
                                        onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-100"
                                        placeholder="Describe payment milestones and conditions..."
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                    <button onClick={onCancel} className="px-8 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors">
                        Discard
                    </button>
                    <button
                        type="submit"
                        form="sales-contract-form"
                        disabled={isLoading}
                        className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && <X className="w-5 h-5 animate-spin" />}
                        {contract ? 'Update Agreement' : 'Finalize Contract'}
                    </button>
                </div>
            </div>
        </div>
    );
};
