import React, { useState, useEffect } from 'react';
import { Plus, Building } from 'lucide-react';
import { SupplierList } from './SupplierList';
import { SupplierForm } from './SupplierForm';
import { Supplier } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';

interface SupplierManagerProps {
    userRole: UserRole;
    onSupplierSelect?: (supplier: Supplier) => void;
    onAuditLog?: (action: string, details: string) => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({
    userRole,
    onSupplierSelect,
    onAuditLog
}) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadSuppliers = async () => {
        setIsLoading(true);
        try {
            const response = await api.procurement.getSuppliers();
            if (response.success && response.data) {
                setSuppliers(response.data);
            } else {
                console.error('Failed to load suppliers:', response.error);
                setSuppliers([]);
            }
        } catch (error) {
            console.error('Failed to load suppliers:', error);
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    const handleAddSupplier = () => {
        setEditingSupplier(null);
        setShowForm(true);
    };

    const handleEditSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setShowForm(true);
    };

    const handleViewSupplier = (supplier: Supplier) => {
        if (onSupplierSelect) {
            onSupplierSelect(supplier);
        } else {
            // If no external handler, maybe we want to show a details modal
            // For now, we will just open the edit form if user can edit
            if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN || userRole === UserRole.PROCUREMENT_MANAGER) {
                handleEditSupplier(supplier);
            }
        }
    };

    const handleSaveSupplier = async (supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> | Supplier) => {
        setIsSubmitting(true);
        try {
            if ('id' in supplierData) {
                // Update existing supplier
                const response = await api.procurement.updateSupplier(supplierData.id, supplierData);

                if (response.success && response.data) {
                    setSuppliers(prev => prev.map(s => s.id === response.data!.id ? response.data! : s));
                    if (onAuditLog) {
                        onAuditLog('SUPPLIER_UPDATE', `Updated supplier: ${response.data.name}`);
                    }
                } else {
                    alert(`Failed to update supplier: ${response.error}`);
                }
            } else {
                // Create new supplier
                const response = await api.procurement.createSupplier(supplierData);

                if (response.success && response.data) {
                    setSuppliers(prev => [...prev, response.data!]);
                    if (onAuditLog) {
                        onAuditLog('SUPPLIER_CREATE', `Created new supplier: ${response.data.name}`);
                    }
                } else {
                    alert(`Failed to create supplier: ${response.error}`);
                }
            }

            setShowForm(false);
            setEditingSupplier(null);
        } catch (error) {
            console.error('Failed to save supplier:', error);
            alert('An unexpected error occurred while saving the supplier.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSupplier = async (supplierId: string) => {
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier) return;

        if (!confirm(`Are you sure you want to deactivate supplier "${supplier.name}"?`)) {
            return;
        }

        try {
            const response = await api.procurement.deactivateSupplier(supplierId);

            if (response.success) {
                // Update locally
                setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, isActive: false } : s));
                if (onAuditLog) {
                    onAuditLog('SUPPLIER_DEACTIVATE', `Deactivated supplier: ${supplier.name}`);
                }
            } else {
                alert(`Failed to deactivate supplier: ${response.error}`);
            }
        } catch (error) {
            console.error('Failed to deactivate supplier:', error);
            alert('Failed to deactivate supplier. Please try again.');
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditingSupplier(null);
    };

    const canAdd = userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.PROCUREMENT_MANAGER;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Building className="w-8 h-8 text-emerald-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
                        <p className="text-slate-600">Manage farmers, aggregators, and cooperatives</p>
                    </div>
                </div>
                {canAdd && (
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddSupplier}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Supplier
                        </button>
                    </div>
                )}
            </div>

            {/* Supplier List */}
            <SupplierList
                suppliers={suppliers}
                userRole={userRole}
                onViewSupplier={handleViewSupplier}
                onEditSupplier={handleEditSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                isLoading={isLoading}
            />

            {/* Supplier Form Modal */}
            {showForm && (
                <SupplierForm
                    supplier={editingSupplier || undefined}
                    onSave={handleSaveSupplier}
                    onCancel={handleCloseForm}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
