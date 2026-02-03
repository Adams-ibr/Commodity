import React, { useState, useEffect } from 'react';
import { Price, UserRole } from '../types';
import { api } from '../services/api';
import { DollarSign, Save, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';

interface PricingManagerProps {
    userRole: string;
}

export const PricingManager: React.FC<PricingManagerProps> = ({ userRole }) => {
    const [prices, setPrices] = useState<Price[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Only authorized roles can edit
    const canEdit = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;

    useEffect(() => {
        loadPrices();
    }, []);

    const loadPrices = async () => {
        setIsLoading(true);
        const data = await api.prices.getAll();
        setPrices(data);
        setIsLoading(false);
    };

    const handleEditClick = (price: Price) => {
        setEditingId(price.id);
        setEditValue(price.pricePerLiter.toString());
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleSave = async (id: string) => {
        const newValue = Number(editValue);
        if (isNaN(newValue) || newValue < 0) {
            setMessage({ type: 'error', text: 'Invalid price value.' });
            return;
        }

        const success = await api.prices.update(id, newValue, 'Admin'); // Ideally get current user name
        if (success) {
            setMessage({ type: 'success', text: 'Price updated successfully.' });
            setPrices(prev => prev.map(p => p.id === id ? { ...p, pricePerLiter: newValue, lastUpdated: new Date().toISOString() } : p));
            setEditingId(null);
        } else {
            setMessage({ type: 'error', text: 'Failed to update price.' });
        }

        setTimeout(() => setMessage(null), 3000);
    };

    if (isLoading) {
        return <div className="p-8 text-center text-slate-500">Loading prices...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-6 h-6 text-indigo-600" />
                        Price Management
                    </h2>
                    <p className="text-slate-500 mt-1">Manage daily selling prices for all products and customer types.</p>
                </div>
                <button
                    onClick={loadPrices}
                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Refresh Prices"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Current Price (₦/L)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Updated</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {prices.map((price) => (
                            <tr key={price.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${price.product.includes('PMS') ? 'bg-orange-500' :
                                            price.product.includes('AGO') ? 'bg-slate-700' :
                                                price.product.includes('DPK') ? 'bg-blue-500' : 'bg-green-500'
                                            }`} />
                                        {price.product}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${price.customerType === 'Dealer' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                        {price.customerType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                                    {editingId === price.id ? (
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-400">₦</span>
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-24 px-2 py-1 border border-indigo-300 rounded focus:ring-indigo-500 focus:border-indigo-500 block sm:text-sm"
                                                autoFocus
                                            />
                                        </div>
                                    ) : (
                                        `₦${price.pricePerLiter.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                    {new Date(price.lastUpdated).toLocaleDateString()}
                                    <span className="text-xs text-slate-400 block">{new Date(price.lastUpdated).toLocaleTimeString()}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {canEdit && (
                                        editingId === price.id ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleSave(price.id)} className="text-green-600 hover:text-green-900 bg-green-50 p-1 rounded">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={handleCancel} className="text-red-600 hover:text-red-900 bg-red-50 p-1 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleEditClick(price)} className="text-indigo-600 hover:text-indigo-900">
                                                Edit
                                            </button>
                                        )
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {!canEdit && (
                <div className="text-center text-sm text-slate-500 italic mt-4">
                    Only Administrators and Managers can update prices.
                </div>
            )}
        </div>
    );
};
