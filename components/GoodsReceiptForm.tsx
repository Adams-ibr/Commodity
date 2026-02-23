import React, { useState, useEffect } from 'react';
import { PackageOpen, Save, X, Calculator, Search } from 'lucide-react';
import { PurchaseContract, Supplier, CommodityType, CommodityBatch, BatchStatus } from '../types_commodity';
import { Location } from '../types_commodity';

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
        supplierId: '',
        commodityTypeId: '',
        locationId: locations.length > 0 ? locations[0].id : '',
        cropYear: new Date().getFullYear().toString(),
        receivedDate: new Date().toISOString().split('T')[0],
        receivedWeight: '',
        bagCount: '',
        bagWeight: '',
        costPerTon: '',
        currency: 'USD',
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-fill from contract
    useEffect(() => {
        if (formData.purchaseContractId) {
            const contract = contracts.find(c => c.id === formData.purchaseContractId);
            if (contract) {
                setFormData(prev => ({
                    ...prev,
                    supplierId: contract.supplierId,
                    commodityTypeId: contract.commodityTypeId,
                    costPerTon: contract.pricePerTon.toString(),
                    currency: contract.currency
                }));
            }
        }
    }, [formData.purchaseContractId, contracts]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.supplierId && !formData.purchaseContractId) {
            newErrors.supplierId = 'Supplier or Contract is required';
        }
        if (!formData.commodityTypeId) newErrors.commodityTypeId = 'Commodity type is required';
        if (!formData.locationId) newErrors.locationId = 'Receiving location is required';

        const weight = Number(formData.receivedWeight);
        if (!formData.receivedWeight || isNaN(weight) || weight <= 0) {
            newErrors.receivedWeight = 'Valid received weight is required';
        }

        const cost = Number(formData.costPerTon);
        if (!formData.costPerTon || isNaN(cost) || cost < 0) {
            newErrors.costPerTon = 'Valid cost per MT is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateWeightFromBags = () => {
        const bags = Number(formData.bagCount) || 0;
        const weightPerBag = Number(formData.bagWeight) || 0; // in kg
        if (bags > 0 && weightPerBag > 0) {
            // Convert kg to MT (metric tons)
            const totalMT = (bags * weightPerBag) / 1000;
            setFormData(prev => ({ ...prev, receivedWeight: totalMT.toString() }));
        }
    };

    const generateBatchNumber = () => {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randId = Math.floor(1000 + Math.random() * 9000);
        return `GRN-${dateStr}-${randId}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        const weight = Number(formData.receivedWeight);
        const costPerTon = Number(formData.costPerTon);

        const batchData: Partial<CommodityBatch> = {
            batchNumber: generateBatchNumber(),
            commodityTypeId: formData.commodityTypeId,
            supplierId: formData.supplierId || '',
            purchaseContractId: formData.purchaseContractId || undefined,
            locationId: formData.locationId,
            cropYear: formData.cropYear,
            receivedDate: formData.receivedDate,
            receivedWeight: weight,
            currentWeight: weight, // Initially matches received
            packagingInfo: {
                bagCount: Number(formData.bagCount) || undefined,
                bagWeight: Number(formData.bagWeight) || undefined,
            },
            status: BatchStatus.RECEIVED,
            costPerTon: costPerTon,
            totalCost: weight * costPerTon,
            currency: formData.currency,
            notes: formData.notes
        };

        onSave(batchData);
    };

    const activeContracts = contracts.filter(c => c.status !== 'CANCELLED' && c.status !== 'COMPLETED');

    return (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-emerald-50 text-emerald-900">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <PackageOpen className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Goods Receipt Note (GRN)</h2>
                            <p className="text-sm text-emerald-700">Receive commodity and create inventory batch</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-emerald-700 hover:bg-emerald-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="grn-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Source Section */}
                        <section className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <Search className="w-4 h-4 text-emerald-600" /> Receipt Source
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Link Purchase Contract (Optional)
                                    </label>
                                    <select
                                        value={formData.purchaseContractId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, purchaseContractId: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="">-- No Contract (Spot Purchase) --</option>
                                        {activeContracts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.contractNumber} - {suppliers.find(s => s.id === c.supplierId)?.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Supplier *
                                    </label>
                                    <select
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                                        disabled={!!formData.purchaseContractId}
                                        className={`w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 ${errors.supplierId ? 'border-red-500' : 'border-slate-300'
                                            } ${!!formData.purchaseContractId ? 'bg-slate-100' : ''}`}
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    {errors.supplierId && <p className="mt-1 text-xs text-red-500">{errors.supplierId}</p>}
                                </div>
                            </div>
                        </section>

                        {/* Commodity Details */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Commodity Type *
                                </label>
                                <select
                                    value={formData.commodityTypeId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, commodityTypeId: e.target.value }))}
                                    disabled={!!formData.purchaseContractId}
                                    className={`w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 ${errors.commodityTypeId ? 'border-red-500' : 'border-slate-300'
                                        } ${!!formData.purchaseContractId ? 'bg-slate-100' : ''}`}
                                >
                                    <option value="">Select Commodity</option>
                                    {commodityTypes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                {errors.commodityTypeId && <p className="mt-1 text-xs text-red-500">{errors.commodityTypeId}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Receiving Location *
                                </label>
                                <select
                                    value={formData.locationId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value }))}
                                    className={`w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 ${errors.locationId ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                >
                                    <option value="">Select Location</option>
                                    {locations.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                                {errors.locationId && <p className="mt-1 text-xs text-red-500">{errors.locationId}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Crop Year / Season
                                </label>
                                <input
                                    type="text"
                                    value={formData.cropYear}
                                    onChange={(e) => setFormData(prev => ({ ...prev, cropYear: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="e.g. 2026"
                                />
                            </div>
                        </section>

                        {/* Weights and Measures */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-800 border-b pb-2 flex items-center justify-between">
                                <span>Receipt Quantities</span>
                                <button
                                    type="button"
                                    onClick={calculateWeightFromBags}
                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                                >
                                    <Calculator className="w-3 h-3" /> Calc from Bags
                                </button>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Bag Count (pcs)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.bagCount}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bagCount: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="e.g. 500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Weight per Bag (KG)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={formData.bagWeight}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bagWeight: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                        placeholder="e.g. 100"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Total Net Weight (MT) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={formData.receivedWeight}
                                        onChange={(e) => setFormData(prev => ({ ...prev, receivedWeight: e.target.value }))}
                                        className={`w-full px-3 py-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 font-semibold bg-emerald-50 ${errors.receivedWeight ? 'border-red-500' : 'border-emerald-200'
                                            }`}
                                        placeholder="e.g. 50.00"
                                    />
                                    {errors.receivedWeight && <p className="mt-1 text-xs text-red-500">{errors.receivedWeight}</p>}
                                </div>
                            </div>
                        </section>

                        {/* Financial Details */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Cost per MT *
                                </label>
                                <div className="flex">
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                        className="px-2 py-2 border border-r-0 border-slate-300 rounded-l-md bg-slate-50 focus:ring-emerald-500 focus:border-emerald-500"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="NGN">NGN</option>
                                    </select>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={formData.costPerTon}
                                        onChange={(e) => setFormData(prev => ({ ...prev, costPerTon: e.target.value }))}
                                        className={`w-full px-3 py-2 border rounded-r-md focus:ring-emerald-500 focus:border-emerald-500 ${errors.costPerTon ? 'border-red-500' : 'border-slate-300'
                                            }`}
                                    />
                                </div>
                                {errors.costPerTon && <p className="mt-1 text-xs text-red-500">{errors.costPerTon}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Received Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.receivedDate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, receivedDate: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Total Value (Auto)
                                </label>
                                <div className="px-3 py-2 border border-transparent bg-slate-100 rounded-md text-slate-700 font-medium h-[42px] flex items-center">
                                    {formData.currency} {((Number(formData.receivedWeight) || 0) * (Number(formData.costPerTon) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        </section>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Receipt Notes / Driver Information
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Truck details, driver name, condition on arrival..."
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="grn-form"
                        disabled={isLoading}
                        className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-md hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Process Goods Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};
