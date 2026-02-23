import React, { useState, useEffect } from 'react';
import { X, Save, FileText, LayoutList } from 'lucide-react';
import { PurchaseContract, Supplier, CommodityType, ContractStatus, Currency } from '../types_commodity';
import { api } from '../services/api';

interface PurchaseContractFormProps {
    contract?: PurchaseContract;
    suppliers: Supplier[];
    commodityTypes: CommodityType[];
    onSave: (contract: Omit<PurchaseContract, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'> | PurchaseContract) => void;
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
        commodityTypeId: '',
        contractDate: new Date().toISOString().split('T')[0],
        deliveryStartDate: '',
        deliveryEndDate: '',
        contractedQuantity: '',
        pricePerTon: '',
        currency: 'USD',
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
            const converted = await api.fx.convertAmount(amount, formData.currency as Currency, 'NGN');
            setEquivalentNGN(converted);
        }
    };

    useEffect(() => {
        if (contract) {
            setFormData({
                supplierId: contract.supplierId,
                commodityTypeId: contract.commodityTypeId,
                contractDate: contract.contractDate.split('T')[0],
                deliveryStartDate: contract.deliveryStartDate?.split('T')[0] || '',
                deliveryEndDate: contract.deliveryEndDate?.split('T')[0] || '',
                contractedQuantity: contract.contractedQuantity.toString(),
                pricePerTon: contract.pricePerTon.toString(),
                currency: contract.currency,
                paymentTerms: contract.paymentTerms || '',
            });
        }
    }, [contract]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
        if (!formData.commodityTypeId) newErrors.commodityTypeId = 'Commodity type is required';
        if (!formData.contractDate) newErrors.contractDate = 'Contract date is required';

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

        // Calculate total value
        const quantity = Number(formData.contractedQuantity);
        const price = Number(formData.pricePerTon);
        const totalValue = quantity * price;

        const contractData: any = {
            ...(contract && { id: contract.id }),
            supplierId: formData.supplierId,
            commodityTypeId: formData.commodityTypeId,
            contractDate: formData.contractDate,
            deliveryStartDate: formData.deliveryStartDate || undefined,
            deliveryEndDate: formData.deliveryEndDate || undefined,
            contractedQuantity: quantity,
            deliveredQuantity: contract?.deliveredQuantity || 0,
            pricePerTon: price,
            totalValue,
            currency: formData.currency,
            paymentTerms: formData.paymentTerms || undefined,
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
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                {contract ? 'Edit Purchase Contract' : 'New Purchase Contract'}
                            </h2>
                            {contract && <p className="text-sm text-slate-500">{contract.contractNumber}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="contract-form" onSubmit={handleSubmit} className="space-y-8">

                        {/* Parties Section */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                                <LayoutList className="w-5 h-5 text-slate-400" />
                                Contract Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Supplier *
                                    </label>
                                    <select
                                        value={formData.supplierId}
                                        onChange={(e) => handleInputChange('supplierId', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.supplierId ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                        disabled={!!contract} // Don't allow changing supplier on edit
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                                        ))}
                                    </select>
                                    {errors.supplierId && <p className="mt-1 text-sm text-red-500">{errors.supplierId}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Commodity Type *
                                    </label>
                                    <select
                                        value={formData.commodityTypeId}
                                        onChange={(e) => handleInputChange('commodityTypeId', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.commodityTypeId ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                        disabled={!!contract} // Don't allow changing commodity on edit
                                    >
                                        <option value="">Select Commodity</option>
                                        {commodityTypes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </select>
                                    {errors.commodityTypeId && <p className="mt-1 text-sm text-red-500">{errors.commodityTypeId}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Contract Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.contractDate}
                                        onChange={(e) => handleInputChange('contractDate', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                    {errors.contractDate && <p className="mt-1 text-sm text-red-500">{errors.contractDate}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Delivery Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.deliveryStartDate}
                                        onChange={(e) => handleInputChange('deliveryStartDate', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Delivery End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.deliveryEndDate}
                                        onChange={(e) => handleInputChange('deliveryEndDate', e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Financial and Quantities Section */}
                        <section className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 border-b pb-2">
                                <FileText className="w-5 h-5 text-slate-400" />
                                Quantities & Pricing
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Quantity (MT) *
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.1"
                                            value={formData.contractedQuantity}
                                            onChange={(e) => handleInputChange('contractedQuantity', e.target.value)}
                                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.contractedQuantity ? 'border-red-500' : 'border-slate-300'
                                                }`}
                                            placeholder="e.g. 1000"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 sm:text-sm">MT</span>
                                        </div>
                                    </div>
                                    {errors.contractedQuantity && <p className="mt-1 text-sm text-red-500">{errors.contractedQuantity}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Price per Ton *
                                    </label>
                                    <div className="flex">
                                        <select
                                            value={formData.currency}
                                            onChange={(e) => handleInputChange('currency', e.target.value)}
                                            className="px-3 py-2 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-slate-600 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="NGN">NGN</option>
                                            <option value="EUR">EUR</option>
                                        </select>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={formData.pricePerTon}
                                            onChange={(e) => handleInputChange('pricePerTon', e.target.value)}
                                            className={`flex-1 min-w-0 px-4 py-2 border rounded-r-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.pricePerTon ? 'border-red-500' : 'border-slate-300'
                                                }`}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.pricePerTon && <p className="mt-1 text-sm text-red-500">{errors.pricePerTon}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Total Value
                                    </label>
                                    <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                                        {formData.currency} {((Number(formData.contractedQuantity) || 0) * (Number(formData.pricePerTon) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {formData.currency !== 'NGN' && (
                                            <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">
                                                ≈ NGN {equivalentNGN.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Est.)
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Payment Terms
                                </label>
                                <input
                                    type="text"
                                    value={formData.paymentTerms}
                                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="e.g. 30 days net, Letter of Credit, etc."
                                />
                            </div>
                        </section>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="contract-form"
                        disabled={isLoading}
                        className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-100 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        {contract ? 'Update Contract' : 'Create Contract'}
                    </button>
                </div>
            </div>
        </div>
    );
};
