import React, { useState, useEffect, useMemo } from 'react';
import { PackageSearch, ArrowRightLeft, MapPin, Search, Layers, ShieldCheck } from 'lucide-react';
import { CommodityBatch, BatchStatus, Location } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { BatchMovementForm } from './BatchMovementForm';

interface WarehouseManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const WarehouseManager: React.FC<WarehouseManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [batches, setBatches] = useState<CommodityBatch[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState<string>('all');

    const [showTransferForm, setShowTransferForm] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<CommodityBatch | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [batchesRes, locationsData] = await Promise.all([
                api.warehouse.getInventory(),
                api.locations.getAll()
            ]);

            if (batchesRes.success && batchesRes.data) {
                setBatches(batchesRes.data);
            }
            setLocations(locationsData || []);
        } catch (error) {
            console.error('Failed to load warehouse data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredBatches = useMemo(() => {
        return batches.filter(batch => {
            const matchesSearch = batch.batchNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLocation = locationFilter === 'all' || batch.locationId === locationFilter;
            return matchesSearch && matchesLocation;
        });
    }, [batches, searchTerm, locationFilter]);

    const getLocationName = (id: string) => {
        return locations.find(l => l.id === id)?.name || 'Unknown Location';
    };

    const handleInitiateTransfer = (batch: CommodityBatch) => {
        setSelectedBatch(batch);
        setShowTransferForm(true);
    };

    const handleSaveTransfer = async (movementData: any) => {
        setIsSubmitting(true);
        try {
            const res = await api.warehouse.recordMovement(movementData);
            if (res.success && res.data) {
                if (onAuditLog) {
                    onAuditLog('BATCH_TRANSFER', `Transferred ${movementData.quantity}MT of ${selectedBatch?.batchNumber} to ${getLocationName(movementData.toLocationId)}`);
                }

                alert(`Success! Scheduled transfer of ${movementData.quantity} MT. In production, this deducts from the source batch and spawns a new allocation.`);
                // Note: For full accuracy the UI should refetch or manually adjust the local state
                await loadData(); // Easiest way to get fresh numbers assuming RPC works
            } else {
                alert(res.error || 'Failed to process transfer');
            }
        } catch (error) {
            console.error(error);
            alert('Error saving transfer data');
        } finally {
            setIsSubmitting(false);
            setShowTransferForm(false);
            setSelectedBatch(undefined);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                        <PackageSearch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Warehouse & Inventory</h1>
                        <p className="text-slate-600">Monitor active stock commodities and manage inter-warehouse transfers</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by batch number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <select
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                        <option value="all">All Locations</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Batch Information</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Location</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Available Wgt (MT)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredBatches.map((batch) => (
                                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-slate-400" />
                                            <span className="font-bold text-slate-800">{batch.batchNumber}</span>
                                        </div>
                                        {batch.grade && <div className="text-xs text-slate-500 mt-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> Grade {batch.grade}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {getLocationName(batch.locationId)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-mono font-medium text-lg text-emerald-600">{batch.currentWeight.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${batch.status === BatchStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleInitiateTransfer(batch)}
                                            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ml-auto border border-blue-200"
                                        >
                                            <ArrowRightLeft className="w-4 h-4" />
                                            Transfer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredBatches.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <PackageSearch className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p>No inventory batches found matching criteria.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showTransferForm && selectedBatch && (
                <BatchMovementForm
                    batch={selectedBatch}
                    locations={locations}
                    onSave={handleSaveTransfer}
                    onCancel={() => {
                        setShowTransferForm(false);
                        setSelectedBatch(undefined);
                    }}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
