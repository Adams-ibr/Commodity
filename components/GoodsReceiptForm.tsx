import React, { useState, useEffect, useMemo } from 'react';
import { PackageOpen, Save, X, Calculator, Search, Layers, CheckCircle } from 'lucide-react';
import { PurchaseContract, Supplier, CommodityType, CommodityBatch, BatchStatus, PurchaseContractItem, Location } from '../types_commodity';

interface GoodsReceiptFormProps {
    contracts: PurchaseContract[];
    suppliers: Supplier[];
    commodityTypes: CommodityType[];
    locations: Location[];
    onSave: (batch: Partial<CommodityBatch>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const GoodsReceiptForm: React.FC<GoodsReceiptFormProps> = ({
    contracts,
    suppliers,
    commodityTypes,
    locations,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        purchaseContractId: '',
        purchaseContractItemId: '',
        supplierId: '',
        commodityTypeId: '',
        locationId: locations.length > 0 ? locations[0].id : '',
        cropYear: new Date().getFullYear().toString(),
        receivedDate: new Date().toISOString().split('T')[0],
        receivedWeight: '',
        bagCount: '',
        bagWeight: '',
        costPerTon: '',
        grade: '',
        currency: 'USD',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedContract = useMemo(() =>
        contracts.find(c => c.id === formData.purchaseContractId),
        [formData.purchaseContractId, contracts]);

    const availableItems = useMemo(() =>
        (selectedContract as any)?.items || [],
        [selectedContract]);

    // Auto-fill from contract/item
    useEffect(() => {
        if (formData.purchaseContractId && selectedContract) {
            setFormData(prev => ({
                ...prev,
                supplierId: selectedContract.supplierId,
                currency: selectedContract.currency
            }));

            // If only one item, auto-select it
            if (availableItems.length === 1 && !formData.purchaseContractItemId) {
                setFormData(prev => ({ ...prev, purchaseContractItemId: availableItems[0].id }));
            }
        }
    }, [formData.purchaseContractId, selectedContract, availableItems]);

    useEffect(() => {
        if (formData.purchaseContractItemId) {
            const item = availableItems.find((i: any) => i.id === formData.purchaseContractItemId);
            if (item) {
                setFormData(prev => ({
                    ...prev,
                    commodityTypeId: item.commodityTypeId,
                    costPerTon: item.unitPrice.toString(),
                    grade: item.grade || ''
                }));
            }
        }
    }, [formData.purchaseContractItemId, availableItems]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
        if (!formData.commodityTypeId) newErrors.commodityTypeId = 'Commodity is required';
        if (!formData.locationId) newErrors.locationId = 'Location is required';
        if (selectedContract && !formData.purchaseContractItemId) newErrors.purchaseContractItemId = 'Line item selection required for contracts';

        const weight = Number(formData.receivedWeight);
        if (!formData.receivedWeight || isNaN(weight) || weight <= 0) newErrors.receivedWeight = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const weight = Number(formData.receivedWeight);
        const costPerTon = Number(formData.costPerTon);

        const batchData: any = {
            batchNumber: `GRN-${Date.now().toString().slice(-8)}`,
            commodityTypeId: formData.commodityTypeId,
            supplierId: formData.supplierId,
            purchaseContractId: formData.purchaseContractId || undefined,
            purchaseContractItemId: formData.purchaseContractItemId || undefined,
            locationId: formData.locationId,
            cropYear: formData.cropYear,
            receivedDate: formData.receivedDate,
            receivedWeight: weight,
            currentWeight: weight,
            grade: formData.grade,
            packagingInfo: JSON.stringify({
                bagCount: Number(formData.bagCount) || 0,
                bagWeight: Number(formData.bagWeight) || 0,
            }),
            status: BatchStatus.RECEIVED,
            costPerTon: costPerTon,
            totalCost: weight * costPerTon,
            currency: formData.currency,
            notes: formData.notes
        };

        onSave(batchData);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || "Supplier";
    const getCommodityName = (id: string) => commodityTypes.find(c => c.id === id)?.name || "Commodity";

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50 transition-all">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-100">
                            <PackageOpen className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Cargo Intake Authorization</h2>
                            <p className="text-slate-500 text-sm font-medium">Record physical arrival and link to trade agreement</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-3 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-2xl transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 bg-white">
                    <form id="grn-form" onSubmit={handleSubmit} className="space-y-12">

                        {/* Section 1: Source & Authorization */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Search className="w-4 h-4" /> 01. Source Verification
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Active Purchase Contract</label>
                                        <select
                                            value={formData.purchaseContractId}
                                            onChange={(e) => handleInputChange('purchaseContractId', e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none transition-all font-bold"
                                        >
                                            <option value="">Spot Purchase (No Link)</option>
                                            {contracts.filter(c => c.status === 'ACTIVE').map(c => (
                                                <option key={c.id} value={c.id}>{c.contractNumber} — {getSupplierName(c.supplierId)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.purchaseContractId && (
                                        <div className="animate-in slide-in-from-top-2 duration-300">
                                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                <Layers className="w-4 h-4 text-indigo-500" /> Contract Line Item *
                                            </label>
                                            <select
                                                value={formData.purchaseContractItemId}
                                                onChange={(e) => handleInputChange('purchaseContractItemId', e.target.value)}
                                                className={`w-full px-4 py-3 bg-white border rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all font-bold ${errors.purchaseContractItemId ? 'border-rose-300 shadow-rose-50 shadow-lg' : 'border-slate-200'}`}
                                            >
                                                <option value="">Select commodity from contract...</option>
                                                {availableItems.map((item: any) => (
                                                    <option key={item.id} value={item.id}>
                                                        {getCommodityName(item.commodityTypeId)} — {item.grade || 'Standard'} ({item.quantity} MT)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {!formData.purchaseContractId && (
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Supplier *</label>
                                            <select
                                                value={formData.supplierId}
                                                onChange={(e) => handleInputChange('supplierId', e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none"
                                            >
                                                <option value="">Select...</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 2: Physical Metrics */}
                            <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Calculator className="w-4 h-4" /> 02. Physical Tonnage
                                </h3>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Received MT *</label>
                                        <input
                                            type="number"
                                            value={formData.receivedWeight}
                                            onChange={(e) => handleInputChange('receivedWeight', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl text-2xl font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-100 transition-all placeholder:text-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                                        <select
                                            value={formData.locationId}
                                            onChange={(e) => handleInputChange('locationId', e.target.value)}
                                            className="w-full px-4 py-4 bg-white border border-slate-100 rounded-2xl font-black text-slate-800 outline-none"
                                        >
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bag Count</label>
                                        <input type="number" value={formData.bagCount} onChange={(e) => handleInputChange('bagCount', e.target.value)} className="w-full outline-none font-bold text-slate-800" placeholder="0" />
                                    </div>
                                    <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Bag Weight (KG)</label>
                                        <input type="number" value={formData.bagWeight} onChange={(e) => handleInputChange('bagWeight', e.target.value)} className="w-full outline-none font-bold text-slate-800" placeholder="0" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Data Integrity */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
                            <div className="p-6 bg-slate-50 rounded-2xl">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Grade / Quality</label>
                                <input type="text" value={formData.grade} onChange={(e) => handleInputChange('grade', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-800 text-lg" placeholder="A1 Prime..." />
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Received Date</label>
                                <input type="date" value={formData.receivedDate} onChange={(e) => handleInputChange('receivedDate', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-800 text-lg" />
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost Validation</label>
                                <div className="flex items-center gap-1 font-black text-slate-800 text-lg">
                                    <span className="text-slate-400">{formData.currency}</span>
                                    <span>{Number(formData.costPerTon).toLocaleString()}</span>
                                    <span className="text-xs text-slate-300 font-normal ml-auto">/ MT</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Auditor Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={2}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:bg-white focus:ring-4 focus:ring-emerald-100 transition-all font-medium"
                                placeholder="Enter any discrepancies or condition notes..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Secured Transaction Entry
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="px-8 py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors">Discard</button>
                        <button
                            type="submit"
                            form="grn-form"
                            disabled={isLoading}
                            className="px-10 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? 'Authorizing...' : 'Finalize Intake'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


