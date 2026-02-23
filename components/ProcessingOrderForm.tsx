import React, { useState, useEffect } from 'react';
import { ProcessingOrder, ProcessingType, CommodityBatch, ProcessingStatus } from '../types_commodity';
import { X, Save, Plus, ArrowRight } from 'lucide-react';

interface ProcessingOrderFormProps {
    order?: ProcessingOrder;
    availableBatches: CommodityBatch[];
    onSave: (orderData: Partial<ProcessingOrder>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const ProcessingOrderForm: React.FC<ProcessingOrderFormProps> = ({
    order,
    availableBatches,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        orderNumber: order?.orderNumber || '',
        processingType: order?.processingType || ProcessingType.CLEANING,
        orderDate: order?.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        processingDate: order?.processingDate ? new Date(order.processingDate).toISOString().split('T')[0] : '',
        notes: order?.notes || '',
        inputBatchId: '',
        inputQuantity: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!order) {
            const timestamp = Date.now().toString().slice(-6);
            setFormData(prev => ({
                ...prev,
                orderNumber: `PO-${timestamp}`
            }));
        }
    }, [order]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.orderNumber.trim()) newErrors.orderNumber = 'Order number is required';
        if (!formData.orderDate) newErrors.orderDate = 'Order date is required';
        if (!formData.inputBatchId) newErrors.inputBatchId = 'Please select an input batch';
        if (!formData.inputQuantity || isNaN(Number(formData.inputQuantity)) || Number(formData.inputQuantity) <= 0) {
            newErrors.inputQuantity = 'Valid quantity required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        // We pass extra pseudo-fields here for the UI to consume and split into inputs/outputs
        const orderData: any = {
            ...(order && { id: order.id }),
            orderNumber: formData.orderNumber,
            processingType: formData.processingType as ProcessingType,
            orderDate: new Date(formData.orderDate).toISOString(),
            processingDate: formData.processingDate ? new Date(formData.processingDate).toISOString() : undefined,
            notes: formData.notes,
            supervisorId: order?.supervisorId || 'admin',
            // UI-only properties to simulate input/output creation 
            _inputBatchId: formData.inputBatchId,
            _inputQuantity: Number(formData.inputQuantity)
        };

        onSave(orderData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {order ? 'Edit Processing Order' : 'New Processing Order'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Configure batch transformation details
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Order Number *
                            </label>
                            <input
                                type="text"
                                value={formData.orderNumber}
                                onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 ${errors.orderNumber ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                readOnly
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Processing Type *
                            </label>
                            <select
                                value={formData.processingType}
                                onChange={(e) => setFormData({ ...formData, processingType: e.target.value as ProcessingType })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                {Object.values(ProcessingType).map(type => (
                                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Order Date *
                            </label>
                            <input
                                type="date"
                                value={formData.orderDate}
                                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.orderDate ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Planned Processing Date
                            </label>
                            <input
                                type="date"
                                value={formData.processingDate}
                                onChange={(e) => setFormData({ ...formData, processingDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-indigo-600" />
                            Input Batch Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Select Source Batch *
                                </label>
                                <select
                                    value={formData.inputBatchId}
                                    onChange={(e) => setFormData({ ...formData, inputBatchId: e.target.value })}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white ${errors.inputBatchId ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                >
                                    <option value="">-- Choose Approved Batch --</option>
                                    {availableBatches.map(batch => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.batchNumber} (Avail: {batch.currentWeight} MT)
                                        </option>
                                    ))}
                                </select>
                                {errors.inputBatchId && <p className="text-red-500 text-xs mt-1">{errors.inputBatchId}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Quantity to Consume (MT) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={formData.inputQuantity}
                                    onChange={(e) => setFormData({ ...formData, inputQuantity: e.target.value })}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${errors.inputQuantity ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="e.g., 50"
                                />
                                {errors.inputQuantity && <p className="text-red-500 text-xs mt-1">{errors.inputQuantity}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Instructions / Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            placeholder="E.g., require secondary sorting for optimal moisture"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            <Save className="w-4 h-4" />
                            {order ? 'Update Order' : 'Create Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
