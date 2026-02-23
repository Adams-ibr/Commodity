import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Building2, Globe, Phone, Mail, FileEdit } from 'lucide-react';
import { Buyer, BuyerType } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';

interface BuyerManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const BuyerManager: React.FC<BuyerManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Future state for a BuyerForm modal:
    // const [showForm, setShowForm] = useState(false);
    // const [editingBuyer, setEditingBuyer] = useState<Buyer | undefined>(undefined);

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
                    onClick={() => alert("Mock: Open Create Buyer Modal")}
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
                            <button className="text-slate-400 hover:text-slate-600 p-1">
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
        </div>
    );
};
