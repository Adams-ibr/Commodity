import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { InventoryStats } from './InventoryStats';
import { InventoryForm } from './InventoryForm';
import { Plus, List, BarChart3, Edit, Trash2 } from 'lucide-react';

interface InventoryManagerProps {
    inventory: InventoryItem[];
    userRole: string; // To check permissions
    onAdd: (item: InventoryItem) => void;
    onUpdate: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
    inventory,
    userRole,
    onAdd,
    onUpdate,
    onDelete
}) => {
    const [viewMode, setViewMode] = useState<'stats' | 'list'>('list');
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<InventoryItem | null>(null);

    const handleAddNew = () => {
        setCurrentItem(null);
        setIsEditing(true);
    };

    const handleEdit = (item: InventoryItem) => {
        setCurrentItem(item);
        setIsEditing(true);
    };

    const handleSave = (item: InventoryItem) => {
        if (currentItem) {
            onUpdate(item);
        } else {
            onAdd(item);
        }
        setIsEditing(false);
        setCurrentItem(null);
    };

    if (isEditing) {
        return (
            <InventoryForm
                initialData={currentItem}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-800">Inventory Ledger</h2>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('stats')}
                            className={`p-1.5 rounded ${viewMode === 'stats' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Charts View"
                        >
                            <BarChart3 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {viewMode === 'stats' ? (
                <InventoryStats items={inventory} />
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location / Tank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Volume (L)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Capacity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {inventory.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.location}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                            {item.product}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.currentVolume.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.maxCapacity.toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${item.status === 'Normal' ? 'bg-green-100 text-green-800' :
                                                item.status === 'Low' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => handleEdit(item)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        {/* Delete hidden for now for safety, or we can enable it */}
                                        {/* <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button> */}
                                    </td>
                                </tr>
                            ))}
                            {inventory.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                                        No inventory items found. Click "Add New Item" to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
