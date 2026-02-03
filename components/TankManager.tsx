import React, { useState, useEffect } from 'react';
import { InventoryItem, UserRole } from '../types';
import { InventoryForm } from './InventoryForm';
import { Plus, Settings, Fuel, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface TankManagerProps {
    userRole: string;
}

export const TankManager: React.FC<TankManagerProps> = ({ userRole }) => {
    const [tanks, setTanks] = useState<InventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTank, setCurrentTank] = useState<InventoryItem | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTanks();
    }, []);

    const loadTanks = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.inventory.getAll();
            setTanks(data);
        } catch (err: any) {
            console.error('Failed to load tanks:', err);
            setError(err.message || 'Failed to load tank configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (item: InventoryItem) => {
        if (currentTank) {
            await api.inventory.update(item);
        } else {
            await api.inventory.create(item);
        }
        await loadTanks();
        setIsEditing(false);
        setCurrentTank(null);
    };

    const handleDelete = async (id: string) => { // Note: Delete not fully implemented in API yet, usually just deactivate
        if (!window.confirm('Are you sure you want to remove this tank configuration?')) return;
        // await api.inventory.delete(id); // Need to implement delete in API if needed
        alert('Tank deletion is restricted to prevent data loss. Please contact support or deactivate via database.');
    };

    if (isEditing) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {currentTank ? 'Edit Tank Configuration' : 'Configure New Tank'}
                    </h2>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Back to List
                    </button>
                </div>
                <InventoryForm
                    initialData={currentTank}
                    onSave={handleSave}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    const getCapacityColor = (current: number, max: number) => {
        const percentage = (current / max) * 100;
        if (percentage < 20) return 'bg-red-500';
        if (percentage > 90) return 'bg-amber-500';
        return 'bg-blue-500';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Fuel className="w-8 h-8 text-indigo-600" />
                        Tank Management
                    </h2>
                    <p className="text-slate-500 mt-1">Configure storage tanks, capacities, and product assignments.</p>
                </div>
                {/* Only Admin/Manager can add tanks */}
                {(userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN) && (
                    <button
                        onClick={() => { setCurrentTank(null); setIsEditing(true); }}
                        className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                    >
                        <Plus className="w-5 h-5" />
                        Add New Tank
                    </button>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error} - Please contact your administrator to check database permissions (RLS).</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                </div>
            ) : tanks.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                    <Fuel className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-slate-700">No Tanks Configured</h3>
                    <p className="text-slate-500 mt-2 max-w-md mx-auto">
                        Get started by adding your first storage tank. You'll need to define its location, product type, and capacity.
                    </p>
                    <button
                        onClick={() => { setCurrentTank(null); setIsEditing(true); }}
                        className="mt-6 text-indigo-600 font-medium hover:text-indigo-800"
                    >
                        + Configure First Tank
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {tanks.map((tank) => (
                        <div key={tank.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold text-slate-800">{tank.location}</h3>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold
                                                ${tank.status === 'Normal' ? 'bg-green-100 text-green-700' :
                                                    tank.status === 'Low' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'}
                                            `}>
                                                {tank.status}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 mt-1">{tank.product}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => { setCurrentTank(tank); setIsEditing(true); }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Configuration"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tank.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Tank"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-500">Capacity Utilization</span>
                                            <span className="font-medium text-slate-700">
                                                {Math.round((tank.currentVolume / tank.maxCapacity) * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${getCapacityColor(tank.currentVolume, tank.maxCapacity)}`}
                                                style={{ width: `${(tank.currentVolume / tank.maxCapacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Current Volume</p>
                                            <p className="text-lg font-bold text-slate-800">{tank.currentVolume.toLocaleString()} L</p>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <p className="text-xs text-slate-500 uppercase font-semibold">Max Capacity</p>
                                            <p className="text-lg font-bold text-slate-800">{tank.maxCapacity.toLocaleString()} L</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>ID: {tank.id}</span>
                                <span>Last Updated: {new Date(tank.lastUpdated).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
