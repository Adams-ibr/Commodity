import React, { useState } from 'react';
import { CommodityBatch, BatchMovement, MovementType, Location } from '../types_commodity';
import { X, Save, ArrowRightLeft } from 'lucide-react';

interface BatchMovementFormProps {
    batch: CommodityBatch;
    locations: Location[];
    onSave: (movementData: Omit<BatchMovement, 'id' | 'createdAt'>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const BatchMovementForm: React.FC<BatchMovementFormProps> = ({
    batch,
    locations,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        movementType: MovementType.TRANSFER,
        toLocationId: '',
        quantity: '',
        movementDate: new Date().toISOString().split('T')[0],
        referenceNumber: `TRF-${batch.batchNumber.split('-').pop()}-${Date.now().toString().slice(-4)}`,
        notes: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.toLocationId) newErrors.toLocationId = 'Destination location is required';
        if (formData.toLocationId === batch.locationId) newErrors.toLocationId = 'Destination must be different from source';

        if (!formData.quantity || isNaN(Number(formData.quantity))) {
            newErrors.quantity = 'Valid quantity is required';
        } else if (Number(formData.quantity) <= 0) {
            newErrors.quantity = 'Quantity must be greater than zero';
        } else if (Number(formData.quantity) > batch.currentWeight) {
            newErrors.quantity = `Quantity cannot exceed current weight (${batch.currentWeight} MT)`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const movementData: Omit<BatchMovement, 'id' | 'createdAt'> = {
            companyId: batch.companyId,
            batchId: batch.id,
            movementType: formData.movementType,
            fromLocationId: batch.locationId,
            toLocationId: formData.toLocationId,
            quantity: Number(formData.quantity),
            movementDate: new Date(formData.movementDate).toISOString(),
            referenceNumber: formData.referenceNumber,
            performedBy: 'admin', // Typically from auth context
            notes: formData.notes
        };

        onSave(movementData);
    };

    const currentLocation = locations.find(loc => loc.id === batch.locationId);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Transfer Stock</h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Batch: {batch.batchNumber}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Current Location:</span>
                            <span className="font-semibold text-slate-800">{currentLocation?.name || 'Unknown Location'}</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                            <span className="text-slate-500">Available Quantity:</span>
                            <span className="font-semibold text-emerald-600">{batch.currentWeight} MT</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Destination Location *
                        </label>
                        <select
                            value={formData.toLocationId}
                            onChange={(e) => setFormData({ ...formData, toLocationId: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white ${errors.toLocationId ? 'border-red-500' : 'border-slate-300'
                                }`}
                        >
                            <option value="">-- Select Destination --</option>
                            {locations.filter(loc => loc.id !== batch.locationId).map(loc => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} ({loc.type})
                                </option>
                            ))}
                        </select>
                        {errors.toLocationId && <p className="text-red-500 text-xs mt-1">{errors.toLocationId}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Transfer Quantity (MT) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={batch.currentWeight}
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.quantity ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                placeholder="0.00"
                            />
                            {errors.quantity && <p className="text-red-500 text-xs mt-1">{errors.quantity}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Transfer Date *
                            </label>
                            <input
                                type="date"
                                value={formData.movementDate}
                                onChange={(e) => setFormData({ ...formData, movementDate: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Reference Number
                        </label>
                        <input
                            type="text"
                            value={formData.referenceNumber}
                            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm bg-slate-50"
                            readOnly
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Notes / Waybill Ref
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={2}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6">
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
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            <Save className="w-4 h-4" />
                            Confirm Transfer
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
