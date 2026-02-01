import React, { useState, useEffect } from 'react';
import { MapPin, Building2, Plus, Edit2, Trash2, Save, X, Store } from 'lucide-react';
import { api, Location } from '../services/api';

interface LocationsManagerProps {
    onLocationChange?: () => void;
}

export const LocationsManager: React.FC<LocationsManagerProps> = ({ onLocationChange }) => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'Depot' | 'Station'>('all');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        type: 'Depot' as 'Depot' | 'Station',
        address: ''
    });

    useEffect(() => {
        loadLocations();
    }, []);

    const loadLocations = async () => {
        setIsLoading(true);
        const data = await api.locations.getAll();
        setLocations(data.filter(l => l.isActive));
        setIsLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editingId) {
            const success = await api.locations.update(editingId, {
                name: formData.name,
                type: formData.type,
                address: formData.address
            });
            if (success) {
                setLocations(locations.map(l =>
                    l.id === editingId
                        ? { ...l, name: formData.name, type: formData.type, address: formData.address }
                        : l
                ));
            }
        } else {
            const newLocation = await api.locations.create({
                name: formData.name,
                type: formData.type,
                address: formData.address,
                isActive: true
            });
            if (newLocation) {
                setLocations([...locations, newLocation]);
            }
        }

        resetForm();
        onLocationChange?.();
    };

    const handleEdit = (location: Location) => {
        setFormData({
            name: location.name,
            type: location.type,
            address: location.address || ''
        });
        setEditingId(location.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to deactivate this location?')) return;

        const success = await api.locations.delete(id);
        if (success) {
            setLocations(locations.filter(l => l.id !== id));
            onLocationChange?.();
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: 'Depot', address: '' });
        setEditingId(null);
        setShowForm(false);
    };

    const filteredLocations = filter === 'all'
        ? locations
        : locations.filter(l => l.type === filter);

    const depotCount = locations.filter(l => l.type === 'Depot').length;
    const stationCount = locations.filter(l => l.type === 'Station').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Locations Management</h2>
                    <p className="text-slate-500">Manage depots and stations across your network</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Location
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{locations.length}</p>
                            <p className="text-sm text-slate-500">Total Locations</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Building2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{depotCount}</p>
                            <p className="text-sm text-slate-500">Depots</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Store className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stationCount}</p>
                            <p className="text-sm text-slate-500">Stations</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                {editingId ? 'Edit Location' : 'Add New Location'}
                            </h3>
                            <button onClick={resetForm} className="p-2 hover:bg-slate-100 rounded-lg">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Location Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="e.g., Lagos Main Depot"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'Depot' })}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${formData.type === 'Depot'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        <Building2 className="w-5 h-5" />
                                        <span className="font-medium">Depot</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'Station' })}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${formData.type === 'Station'
                                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                                : 'border-slate-200 hover:border-indigo-300'
                                            }`}
                                    >
                                        <Store className="w-5 h-5" />
                                        <span className="font-medium">Station</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Address (Optional)
                                </label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Full address..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {(['all', 'Depot', 'Station'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${filter === tab
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab === 'all' ? 'All Locations' : `${tab}s`}
                    </button>
                ))}
            </div>

            {/* Locations List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : filteredLocations.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No locations found. Add your first location!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLocations.map((location) => (
                        <div
                            key={location.id}
                            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${location.type === 'Depot'
                                            ? 'bg-amber-100'
                                            : 'bg-emerald-100'
                                        }`}>
                                        {location.type === 'Depot' ? (
                                            <Building2 className="w-5 h-5 text-amber-600" />
                                        ) : (
                                            <Store className="w-5 h-5 text-emerald-600" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">{location.name}</h4>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${location.type === 'Depot'
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-emerald-50 text-emerald-700'
                                            }`}>
                                            {location.type}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(location)}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(location.id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {location.address && (
                                <p className="text-sm text-slate-500 mt-2">
                                    <MapPin className="w-4 h-4 inline mr-1" />
                                    {location.address}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
