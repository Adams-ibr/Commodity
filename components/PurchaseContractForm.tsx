import React, { useState, useEffect } from 'react';
import { X, Save, FileText, LayoutList, Plus, Trash2, Calculator } from 'lucide-react';
import { PurchaseContract, Supplier, CommodityType, ContractStatus, Currency, PurchaseContractItem } from '../types_commodity';
import { api } from '../services/api';

interface PurchaseContractFormProps {
    contract?: PurchaseContract;
    suppliers: Supplier[];
    commodityTypes: CommodityType[];
    onSave: (contractData: any) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const PurchaseContractForm: React.FC<PurchaseContractFormProps> = ({
    contract,
    suppliers,
    commodityTypes,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        supplierId: '',
        contractDate: new Date().toISOString().split('T')[0],
        deliveryStartDate: '',
        deliveryEndDate: '',
        currency: 'USD' as Currency,
        paymentTerms: '',
        items: [] as Partial<PurchaseContractItem>[]
    });

    const [equivalentNGN, setEquivalentNGN] = useState<number>(0);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (contract) {
            setFormData({
                supplierId: contract.supplierId,
                contractDate: contract.contractDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                deliveryStartDate: contract.deliveryStartDate?.split('T')[0] || '',
                deliveryEndDate: contract.deliveryEndDate?.split('T')[0] || '',
                currency: contract.currency as Currency,
                paymentTerms: contract.paymentTerms || '',
                items: contract.items || []
            });
        } else {
            setFormData(prev => ({
                ...prev,
                items: [{ commodityTypeId: '', quantity: 0, unitPrice: 0 }]
            }));
        }
    }, [contract]);

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    };

    useEffect(() => {
        const updateEquivalent = async () => {
            const amount = calculateTotal();
            if (formData.currency === 'NGN') {
                setEquivalentNGN(amount);
            } else {
                const converted = await api.fx.convertAmount(amount, formData.currency, 'NGN');
                setEquivalentNGN(converted);
            }
        };
        updateEquivalent();
    }, [formData.items, formData.currency]);

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { commodityTypeId: '', quantity: 0, unitPrice: 0, grade: '' }]
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
        if (formData.items.length === 0) newErrors.items = 'At least one item is required';

        formData.items.forEach((item, index) => {
            if (!item.commodityTypeId) newErrors[`item_${index}_type`] = 'Required';
            if (!item.quantity || item.quantity <= 0) newErrors[`item_${index}_qty`] = 'Required';
            if (item.unitPrice === undefined || item.unitPrice < 0) newErrors[`item_${index}_price`] = 'Required';
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const totalValue = calculateTotal();
        const totalQuantity = formData.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

        // Ensure items have all required fields for the API
        const cleanedItems = formData.items.map(item => ({
            commodityTypeId: item.commodityTypeId || '',
            grade: item.grade || '',
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            currency: formData.currency,
            deliveredQuantity: (item as any).deliveredQuantity || 0
        }));

        const contractData = {
            ...(contract && { id: contract.id }),
            supplierId: formData.supplierId,
            commodityTypeId: cleanedItems[0]?.commodityTypeId || '',
            contractDate: formData.contractDate,
            deliveryStartDate: formData.deliveryStartDate || undefined,
            deliveryEndDate: formData.deliveryEndDate || undefined,
            contractedQuantity: totalQuantity,
            deliveredQuantity: contract?.deliveredQuantity || 0,
            pricePerTon: cleanedItems[0]?.unitPrice || 0,
            totalValue,
            totalAmount: totalValue,
            currency: formData.currency,
            paymentTerms: formData.paymentTerms || undefined,
            items: cleanedItems
        };

        onSave(contractData);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-100">
                            <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                {contract ? 'Edit Purchase Agreement' : 'New Inbound Multi-Item Contract'}
                            </h2>
                            <p className="text-slate-500 text-sm font-medium tracking-tight">Manage supply sources, items, and delivery windows</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <form id="purchase-contract-form" onSubmit={handleSubmit} className="space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Supplier *</label>
                                <select
                                    value={formData.supplierId}
                                    onChange={(e) => handleInputChange('supplierId', e.target.value)}
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-4 focus:ring-emerald-100 outline-none transition-all ${errors.supplierId ? 'border-rose-300' : 'border-slate-200'}`}
                                >
                                    <option value="">Choose a supplier...</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Contract Date</label>
                                <input
                                    type="date"
                                    value={formData.contractDate}
                                    onChange={(e) => handleInputChange('contractDate', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Currency</label>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => handleInputChange('currency', e.target.value as Currency)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-100 font-bold"
                                >
                                    <option value="USD">USD</option>
                                    <option value="NGN">NGN</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                    <LayoutList className="w-5 h-5 text-emerald-500" />
                                    Procured Items
                                </h3>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                            </div>

                            <div className="space-y-4">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all hover:bg-slate-50">
                                        <div className="md:col-span-4">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Commodity Type</label>
                                            <select
                                                value={item.commodityTypeId}
                                                onChange={(e) => updateItem(index, 'commodityTypeId', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-sm"
                                            >
                                                <option value="">Select...</option>
                                                {commodityTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Grade</label>
                                            <input
                                                type="text"
                                                value={item.grade}
                                                onChange={(e) => updateItem(index, 'grade', e.target.value)}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-sm"
                                                placeholder="e.g. A1"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Quantity (MT)</label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-sm font-bold"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-tight mb-1">Cost/MT</label>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-100 text-sm font-bold text-emerald-600"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex flex-col justify-end">
                                            <div className="h-9 flex items-center font-black text-slate-900 text-sm truncate">
                                                {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="md:col-span-1 flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Calculator className="w-4 h-4" /> Logistics & Terms
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Start</label>
                                        <input type="date" value={formData.deliveryStartDate} onChange={(e) => handleInputChange('deliveryStartDate', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Delivery End</label>
                                        <input type="date" value={formData.deliveryEndDate} onChange={(e) => handleInputChange('deliveryEndDate', e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Payment Terms</label>
                                        <textarea
                                            rows={2}
                                            value={formData.paymentTerms}
                                            onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none"
                                            placeholder="e.g. 30 Days Net..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-900 rounded-[2rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Total Purchase Value</span>
                                        <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest">{formData.currency}</div>
                                    </div>
                                    <div className="text-5xl font-black tracking-tight mb-2">
                                        {formData.currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    {formData.currency !== 'NGN' && (
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                            <span className="text-xs opacity-50 uppercase tracking-widest">Local Est:</span>
                                            <span>₦ {equivalentNGN.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
                    <button onClick={onCancel} className="px-8 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors">Cancel</button>
                    <button
                        type="submit"
                        form="purchase-contract-form"
                        disabled={isLoading}
                        className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {isLoading ? 'Saving...' : contract ? 'Update Agreement' : 'Finalize Contract'}
                    </button>
                </div>
            </div>
        </div>
    );
};
