import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Building, FileText } from 'lucide-react';
import { Supplier, SupplierType } from '../types_commodity';

interface SupplierFormProps {
    supplier?: Supplier;
    onSave: (supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> | Supplier) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
    supplier,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        name: '',
        type: SupplierType.FARMER,
        registrationNumber: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        bankDetails: { bankName: '', accountNumber: '', accountName: '' },
        taxInfo: { taxId: '' },
        isActive: true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (supplier) {
            setFormData({
                name: supplier.name,
                type: supplier.type,
                registrationNumber: supplier.registrationNumber || '',
                contactPerson: supplier.contactPerson || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address?.street || '', // Simplification for now
                bankDetails: supplier.bankDetails || { bankName: '', accountNumber: '', accountName: '' },
                taxInfo: supplier.taxInfo || { taxId: '' },
                isActive: supplier.isActive
            });
        }
    }, [supplier]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Supplier name is required';
        }

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (formData.phone && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const supplierData: any = {
            ...(supplier && { id: supplier.id }),
            name: formData.name.trim(),
            type: formData.type,
            registrationNumber: formData.registrationNumber.trim() || undefined,
            contactPerson: formData.contactPerson.trim() || undefined,
            phone: formData.phone.trim() || undefined,
            email: formData.email.trim() || undefined,
            address: { street: formData.address.trim() || undefined },
            bankDetails: {
                bankName: formData.bankDetails.bankName.trim() || undefined,
                accountNumber: formData.bankDetails.accountNumber.trim() || undefined,
                accountName: formData.bankDetails.accountName.trim() || undefined
            },
            taxInfo: {
                taxId: formData.taxInfo.taxId.trim() || undefined
            },
            isActive: formData.isActive
        };

        onSave(supplierData);
    };

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleNestedChange = (category: 'bankDetails' | 'taxInfo', field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-800">
                        {supplier ? 'Edit Supplier' : 'Add New Supplier'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Basic Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Supplier Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.name ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="Enter supplier name"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Supplier Type *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleInputChange('type', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value={SupplierType.FARMER}>Farmer</option>
                                    <option value={SupplierType.AGGREGATOR}>Aggregator</option>
                                    <option value={SupplierType.COOPERATIVE}>Cooperative</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Registration / Cooperative Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.registrationNumber}
                                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Reg No. (optional)"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Status
                                </label>
                                <select
                                    value={formData.isActive ? "true" : "false"}
                                    onChange={(e) => handleInputChange('isActive', e.target.value === "true")}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <User className="w-5 h-5" />
                            Contact Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Contact Person
                                </label>
                                <input
                                    type="text"
                                    value={formData.contactPerson}
                                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Primary contact name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.phone ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="+234 xxx xxx xxxx"
                                />
                                {errors.phone && (
                                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${errors.email ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="supplier@example.com"
                                />
                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Address
                            </label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                placeholder="Enter supplier address (Farm/Warehouse location)"
                            />
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Financial Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.bankName}
                                    onChange={(e) => handleNestedChange('bankDetails', 'bankName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="E.g. Zenith Bank"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Account Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.accountNumber}
                                    onChange={(e) => handleNestedChange('bankDetails', 'accountNumber', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="10-digit account number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Account Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.bankDetails.accountName}
                                    onChange={(e) => handleNestedChange('bankDetails', 'accountName', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Registered account name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tax ID / TIN
                                </label>
                                <input
                                    type="text"
                                    value={formData.taxInfo.taxId}
                                    onChange={(e) => handleNestedChange('taxInfo', 'taxId', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Tax Identification Number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {supplier ? 'Update Supplier' : 'Create Supplier'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
