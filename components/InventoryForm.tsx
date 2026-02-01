import React, { useState, useEffect } from 'react';
import { InventoryItem, ProductType } from '../types';
import { Save, X } from 'lucide-react';
import { api, Location } from '../services/api';

interface InventoryFormProps {
  initialData?: InventoryItem | null;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({ initialData, onSave, onCancel }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    location: '',
    product: ProductType.PMS,
    maxCapacity: 0,
    minThreshold: 0,
    currentVolume: 0,
    status: 'Normal'
  });

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const loadLocations = async () => {
    setIsLoadingLocations(true);
    const data = await api.locations.getAll();
    setLocations(data);
    setIsLoadingLocations(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location || !formData.maxCapacity) return;

    // Generate ID for new items if not present
    const itemToSave = {
      ...formData,
      id: initialData?.id || `T-${Math.floor(Math.random() * 10000)}`,
      lastUpdated: new Date().toISOString()
    } as InventoryItem;

    onSave(itemToSave);
  };

  const handleChange = (field: keyof InventoryItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          {initialData ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Location / Depot
          </label>
          <select
            required
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Location --</option>
            {isLoadingLocations ? (
              <option disabled>Loading locations...</option>
            ) : locations.length === 0 ? (
              <option disabled>No locations found. Add locations first.</option>
            ) : (
              locations.map(loc => (
                <option key={loc.id} value={loc.name}>
                  {loc.name} ({loc.type})
                </option>
              ))
            )}
          </select>
          {locations.length === 0 && !isLoadingLocations && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Please add locations in the Locations module first.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tank Name / Identifier
          </label>
          <input
            type="text"
            placeholder="e.g., Tank A, Storage Unit 1"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => {
              const loc = formData.location || '';
              const tankName = e.target.value;
              // Combine location + tank name
              handleChange('location', loc.split(' - ')[0] + (tankName ? ` - ${tankName}` : ''));
            }}
          />
          <p className="text-xs text-slate-400 mt-1">Optional: Add tank identifier to location</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Product Type
          </label>
          <select
            value={formData.product}
            onChange={(e) => handleChange('product', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {Object.values(ProductType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max Capacity (L)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.maxCapacity}
              onChange={(e) => handleChange('maxCapacity', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Threshold (L)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.minThreshold}
              onChange={(e) => handleChange('minThreshold', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current Volume (L)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.currentVolume}
              onChange={(e) => handleChange('currentVolume', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Normal">Normal</option>
              <option value="Low">Low</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Item
          </button>
        </div>
      </form>
    </div>
  );
};
