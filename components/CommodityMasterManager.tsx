import React, { useState, useEffect } from 'react';
import {
    Package, Plus, Edit2, X, Search, Loader2, ToggleLeft, ToggleRight,
    Tag, Hash, Globe, Layers, RefreshCw, ChevronDown, CheckCircle, XCircle
} from 'lucide-react';
import { CommodityCategory, CommodityType } from '../types_commodity';
import { api } from '../services/api';

interface CommodityMasterManagerProps {
    userRole: string;
    onAuditLog?: (action: string, details: string) => void;
}

export const CommodityMasterManager: React.FC<CommodityMasterManagerProps> = ({ userRole, onAuditLog }) => {
    const [activeTab, setActiveTab] = useState<'categories' | 'types'>('categories');
    const [categories, setCategories] = useState<CommodityCategory[]>([]);
    const [types, setTypes] = useState<CommodityType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Category form
    const [showCatForm, setShowCatForm] = useState(false);
    const [catName, setCatName] = useState('');
    const [catDesc, setCatDesc] = useState('');
    const [isSavingCat, setIsSavingCat] = useState(false);

    // Type form
    const [showTypeForm, setShowTypeForm] = useState(false);
    const [typeName, setTypeName] = useState('');
    const [typeCode, setTypeCode] = useState('');
    const [typeCategoryId, setTypeCategoryId] = useState('');
    const [typeHsCode, setTypeHsCode] = useState('');
    const [typeUnit, setTypeUnit] = useState('MT');
    const [typeExportEligible, setTypeExportEligible] = useState(true);
    const [isSavingType, setIsSavingType] = useState(false);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const [catRes, typeRes] = await Promise.all([
                api.commodityMaster.getCategories(),
                api.commodityMaster.getCommodityTypes()
            ]);
            if (catRes.success && catRes.data) setCategories(catRes.data);
            if (typeRes.success && typeRes.data) setTypes(typeRes.data);
        } catch (error) {
            console.error('Failed to load commodity master data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCategory = async () => {
        if (!catName.trim()) return;
        setIsSavingCat(true);
        try {
            const res = await api.commodityMaster.createCategory({
                companyId: '00000000-0000-0000-0000-000000000001',
                name: catName.trim(),
                description: catDesc.trim(),
                isActive: true
            });
            if (res.success) {
                await loadAll();
                setShowCatForm(false);
                setCatName('');
                setCatDesc('');
                if (onAuditLog) onAuditLog('CREATE_CATEGORY', `Created category: ${catName}`);
            }
        } catch (error) {
            console.error('Failed to create category:', error);
        } finally {
            setIsSavingCat(false);
        }
    };

    const handleCreateType = async () => {
        if (!typeName.trim() || !typeCode.trim()) return;
        setIsSavingType(true);
        try {
            const res = await api.commodityMaster.createCommodityType({
                companyId: '00000000-0000-0000-0000-000000000001',
                categoryId: typeCategoryId || categories[0]?.id || '',
                name: typeName.trim(),
                code: typeCode.trim().toUpperCase(),
                hsCode: typeHsCode.trim(),
                exportEligible: typeExportEligible,
                qualityParameters: [],
                packagingTypes: [],
                standardUnit: typeUnit,
                isActive: true
            });
            if (res.success) {
                await loadAll();
                setShowTypeForm(false);
                setTypeName('');
                setTypeCode('');
                setTypeHsCode('');
                setTypeUnit('MT');
                setTypeExportEligible(true);
                if (onAuditLog) onAuditLog('CREATE_COMMODITY_TYPE', `Created commodity type: ${typeName} (${typeCode})`);
            }
        } catch (error) {
            console.error('Failed to create type:', error);
        } finally {
            setIsSavingType(false);
        }
    };

    const handleToggleType = async (type: CommodityType) => {
        const newStatus = !type.isActive;
        const res = await api.commodityMaster.toggleCommodityTypeStatus(type.id, newStatus);
        if (res.success) {
            setTypes(prev => prev.map(t => t.id === type.id ? { ...t, isActive: newStatus } : t));
            if (onAuditLog) onAuditLog('TOGGLE_COMMODITY', `${newStatus ? 'Activated' : 'Deactivated'}: ${type.name}`);
        }
    };

    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const filteredCategories = categories.filter(c =>
        !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredTypes = types.filter(t =>
        !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 rounded-lg">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Commodity Master Data</h2>
                        <p className="text-slate-600 font-medium">{categories.length} categories • {types.length} commodity types</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadAll} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => activeTab === 'categories' ? setShowCatForm(true) : setShowTypeForm(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm"
                    >
                        <Plus size={20} />
                        <span>{activeTab === 'categories' ? 'New Category' : 'New Commodity Type'}</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'categories' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Categories ({categories.length})</div>
                </button>
                <button
                    onClick={() => setActiveTab('types')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'types' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Commodity Types ({types.length})</div>
                </button>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'categories' ? 'Search categories...' : 'Search commodity types by name or code...'}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Categories Tab */}
            {activeTab === 'categories' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((cat) => {
                        const typeCount = types.filter(t => t.categoryId === cat.id).length;
                        return (
                            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="p-2 bg-emerald-100 rounded-lg">
                                        <Tag className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${cat.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {cat.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                                <p className="text-sm text-slate-500 mt-1">{cat.description || 'No description'}</p>
                                <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Layers className="w-4 h-4" /> {typeCount} types</span>
                                    <span className="flex items-center gap-1">{new Date(cat.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        );
                    })}
                    {filteredCategories.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400">
                            <Tag className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                            <p>No categories found. Create one to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Types Tab */}
            {activeTab === 'types' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Commodity</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Code</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">HS Code</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Unit</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Export</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTypes.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 rounded-lg">
                                                    <Package className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <span className="font-medium text-slate-800">{t.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-700 font-mono text-sm rounded">{t.code}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{getCategoryName(t.categoryId)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">{t.hsCode || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{t.standardUnit}</td>
                                        <td className="px-6 py-4">
                                            {t.exportEligible ? (
                                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-700"><Globe className="w-3.5 h-3.5" /> Yes</span>
                                            ) : (
                                                <span className="text-xs text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                {t.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleToggleType(t)}
                                                className={`p-2 rounded-lg transition-colors ${t.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                title={t.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {t.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTypes.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                            <Package className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                            <p>No commodity types found. Create a category first, then add types.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Category Modal */}
            {showCatForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-emerald-600" /> New Category
                            </h3>
                            <button onClick={() => setShowCatForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category Name *</label>
                                <input
                                    type="text" value={catName} onChange={(e) => setCatName(e.target.value)}
                                    placeholder="e.g. Grains, Oilseeds, Spices"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                                <textarea
                                    value={catDesc} onChange={(e) => setCatDesc(e.target.value)}
                                    placeholder="Brief description of this commodity category"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 resize-none"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => setShowCatForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                            <button
                                onClick={handleCreateCategory}
                                disabled={!catName.trim() || isSavingCat}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSavingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {isSavingCat ? 'Creating...' : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Type Modal */}
            {showTypeForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Package className="w-5 h-5 text-indigo-600" /> New Commodity Type
                            </h3>
                            <button onClick={() => setShowTypeForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Commodity Name *</label>
                                    <input
                                        type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)}
                                        placeholder="e.g. Raw Sesame Seeds"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Code *</label>
                                    <input
                                        type="text" value={typeCode} onChange={(e) => setTypeCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. SES-RAW"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                                <select
                                    value={typeCategoryId}
                                    onChange={(e) => setTypeCategoryId(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                >
                                    <option value="">Select category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">HS Code</label>
                                    <input
                                        type="text" value={typeHsCode} onChange={(e) => setTypeHsCode(e.target.value)}
                                        placeholder="e.g. 1207.40"
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Standard Unit</label>
                                    <select
                                        value={typeUnit} onChange={(e) => setTypeUnit(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                    >
                                        <option value="MT">Metric Tons (MT)</option>
                                        <option value="KG">Kilograms (KG)</option>
                                        <option value="LBS">Pounds (LBS)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTypeExportEligible(!typeExportEligible)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${typeExportEligible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {typeExportEligible ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                    Export Eligible
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <button onClick={() => setShowTypeForm(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                            <button
                                onClick={handleCreateType}
                                disabled={!typeName.trim() || !typeCode.trim() || isSavingType}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSavingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {isSavingType ? 'Creating...' : 'Create Type'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
