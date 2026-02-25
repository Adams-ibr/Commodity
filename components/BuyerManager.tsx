import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Building2, Globe, Phone, Mail, FileEdit, X, Save } from 'lucide-react';
import { Buyer, BuyerType } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';

interface BuyerManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

interface BuyerFormData {
    name: string;
    type: BuyerType;
    country: string;
    registrationNumber: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    creditLimit: number;
    paymentTerms: string;
    preferredCurrency: string;
}

const EMPTY_FORM: BuyerFormData = {
    name: '', type: 'EXPORT' as BuyerType, country: '', registrationNumber: '',
    contactPerson: '', phone: '', email: '', address: '',
    creditLimit: 0, paymentTerms: 'NET_30', preferredCurrency: 'USD',
};

export const BuyerManager: React.FC<BuyerManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showForm, setShowForm] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState<Buyer | undefined>(undefined);
    const [formData, setFormData] = useState<BuyerFormData>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadBuyers();
    }, []);

    const loadBuyers = async () => {
        try {
            setIsLoading(true);
            const res = await api.sales.getBuyers();
            if (res.success && res.data) {
                setBuyers(res.data);
            }
        } catch (error) {
            console.error('Failed to load buyers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const openCreateForm = () => {
        setEditingBuyer(undefined);
        setFormData(EMPTY_FORM);
        setShowForm(true);
    };

    const openEditForm = (buyer: Buyer) => {
        setEditingBuyer(buyer);
        setFormData({
            name: buyer.name, type: buyer.type, country: buyer.country || '',
            registrationNumber: buyer.registrationNumber || '', contactPerson: buyer.contactPerson || '',
            phone: buyer.phone || '', email: buyer.email || '', address: buyer.address || '',
            creditLimit: buyer.creditLimit || 0, paymentTerms: buyer.paymentTerms || 'NET_30',
            preferredCurrency: buyer.preferredCurrency || 'USD',
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;
        setIsSaving(true);
        try {
            if (editingBuyer) {
                const res = await api.sales.updateBuyer(editingBuyer.id, formData);
                if (res.success) {
                    onAuditLog?.('UPDATE_BUYER', `Updated buyer: ${formData.name}`);
                }
            } else {
                const res = await api.sales.createBuyer(formData);
                if (res.success) {
                    onAuditLog?.('CREATE_BUYER', `Created buyer: ${formData.name}`);
                }
            }
            setShowForm(false);
            loadBuyers();
        } catch (error) {
            console.error('Failed to save buyer:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBuyers = useMemo(() => {
        return buyers.filter(b =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (b.country && b.country.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [buyers, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Buyer Management</h2>
                    <p className="text-slate-600 font-medium">Manage B2B Export and Processing Client Accounts</p>
                </div>
                <button
                    onClick={openCreateForm}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>New Buyer Account</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search buyers by name, country, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBuyers.map(buyer => (
                    <div key={buyer.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{buyer.name}</h3>
                                <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded uppercase tracking-wider">
                                    {buyer.type}
                                </span>
                            </div>
                            <button onClick={() => openEditForm(buyer)} className="text-slate-400 hover:text-slate-600 p-1">
                                <FileEdit className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            <div className="flex items-center text-sm text-slate-600">
                                <Globe className="w-4 h-4 mr-3 text-slate-400" />
                                {buyer.country || 'No Country Specified'}
                            </div>
                            <div className="flex items-center text-sm text-slate-600">
                                <Building2 className="w-4 h-4 mr-3 text-slate-400" />
                                {buyer.registrationNumber || 'No Reg Number'}
                            </div>
                            {buyer.email && (
                                <div className="flex items-center text-sm text-slate-600">
                                    <Mail className="w-4 h-4 mr-3 text-slate-400" />
                                    <span className="truncate">{buyer.email}</span>
                                </div>
                            )}
                            {buyer.phone && (
                                <div className="flex items-center text-sm text-slate-600">
                                    <Phone className="w-4 h-4 mr-3 text-slate-400" />
                                    {buyer.phone}
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
                            <div className="text-slate-500 font-medium">Credit Limit:</div>
                            <div className="font-bold text-slate-700">
                                {buyer.preferredCurrency} {buyer.creditLimit ? buyer.creditLimit.toLocaleString() : 'N/A'}
                            </div>
                        </div>
                    </div>
                ))}

                {filteredBuyers.length === 0 && (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                        <Users className="w-16 h-16 mb-4 text-slate-300" />
                        <p className="text-lg">No buyers found.</p>
                        {searchTerm && <p className="text-sm mt-1">Try adjusting your search criteria</p>}
                    </div>
                )}
            </div>

            {/* ── Buyer Form Modal ── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingBuyer ? `Edit Buyer: ${editingBuyer.name}` : 'Create New Buyer'}
                            </h3>
                            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name *</label>
                                    <input type="text" required value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Buyer Type *</label>
                                    <select value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as BuyerType })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none">
                                        <option value="EXPORT">Export</option>
                                        <option value="LOCAL">Local</option>
                                        <option value="PROCESSING">Processing</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
                                    <input type="text" value={formData.country}
                                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Registration Number</label>
                                    <input type="text" value={formData.registrationNumber}
                                        onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Person</label>
                                    <input type="text" value={formData.contactPerson}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                                    <input type="email" value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                                    <input type="text" value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Address</label>
                                    <textarea value={formData.address} rows={2}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Preferred Currency</label>
                                    <select value={formData.preferredCurrency}
                                        onChange={e => setFormData({ ...formData, preferredCurrency: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none">
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="NGN">NGN</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Credit Limit</label>
                                    <input type="number" value={formData.creditLimit}
                                        onChange={e => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Payment Terms</label>
                                    <select value={formData.paymentTerms}
                                        onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none">
                                        <option value="NET_30">Net 30</option>
                                        <option value="NET_60">Net 60</option>
                                        <option value="NET_90">Net 90</option>
                                        <option value="ADVANCE">Advance Payment</option>
                                        <option value="LC">Letter of Credit</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className="px-5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50">
                                    <Save size={18} />
                                    {isSaving ? 'Saving...' : (editingBuyer ? 'Update Buyer' : 'Create Buyer')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
