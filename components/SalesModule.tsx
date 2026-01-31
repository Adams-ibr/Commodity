import React, { useState } from 'react';
import { InventoryItem, ProductType, CustomerType, Customer, TransactionType } from '../types';
import { ShoppingCart, Users, Truck, Check } from 'lucide-react';

interface SalesModuleProps {
    inventory: InventoryItem[];
    onCommitTransaction: (data: any) => void;
}

// Mock customers for demo
const MOCK_CUSTOMERS: Customer[] = [
    { id: 'CUST-001', name: 'Total Energies Dealer', type: CustomerType.DEALER, contactInfo: '080-DEALER-1' },
    { id: 'CUST-002', name: 'ABC Logistics', type: CustomerType.END_USER, contactInfo: '080-USER-2' },
    { id: 'CUST-003', name: 'Mobil Dealer', type: CustomerType.DEALER, contactInfo: '080-DEALER-3' },
    { id: 'CUST-004', name: 'Dangote Transport', type: CustomerType.END_USER, contactInfo: '080-USER-4' }
];

export const SalesModule: React.FC<SalesModuleProps> = ({ inventory, onCommitTransaction }) => {
    const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.DEALER);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [product, setProduct] = useState<ProductType>(ProductType.PMS);
    const [sourceId, setSourceId] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [refDoc, setRefDoc] = useState<string>('');

    const availableCustomers = MOCK_CUSTOMERS.filter(c => c.type === customerType);
    const availableInventory = inventory.filter(i => i.product === product && i.currentVolume > 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cust = MOCK_CUSTOMERS.find(c => c.id === selectedCustomer);

        onCommitTransaction({
            type: TransactionType.SALE,
            product,
            volume: Number(volume),
            sourceId,
            destination: cust?.name || 'External Customer',
            refDoc,
            customerId: selectedCustomer,
            customerName: cust?.name
        });

        // Reset form
        setVolume('');
        setRefDoc('');
        setSelectedCustomer('');
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Form */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <ShoppingCart className="w-6 h-6 text-indigo-700" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">New Sale</h2>
                        <p className="text-sm text-slate-500">Process sales for Dealers & End Users</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Customer Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => { setCustomerType(CustomerType.DEALER); setSelectedCustomer(''); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${customerType === CustomerType.DEALER
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 hover:border-indigo-300'
                                }`}
                        >
                            <Truck className="w-6 h-6 mb-2" />
                            <span className="font-semibold">Dealer</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setCustomerType(CustomerType.END_USER); setSelectedCustomer(''); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${customerType === CustomerType.END_USER
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 hover:border-indigo-300'
                                }`}
                        >
                            <Users className="w-6 h-6 mb-2" />
                            <span className="font-semibold">End User</span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
                        <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500"
                        >
                            <option value="">-- Select {customerType} --</option>
                            {availableCustomers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                            <select
                                value={product}
                                onChange={(e) => { setProduct(e.target.value as ProductType); setSourceId(''); }}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            >
                                {Object.values(ProductType).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Source Tank</label>
                            <select
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                            >
                                <option value="">-- Select Source --</option>
                                {availableInventory.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.location} ({item.currentVolume.toLocaleString()}L)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Volume (Liters)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={volume}
                                onChange={(e) => setVolume(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Reference / Invoice #</label>
                            <input
                                type="text"
                                required
                                value={refDoc}
                                onChange={(e) => setRefDoc(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                                placeholder="INV-..."
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Process Sale
                    </button>
                </form>
            </div>

            {/* Summary / Info Panel */}
            <div className="space-y-6">
                <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-bold mb-4">Sales Policy Guidelines</h3>
                    <ul className="space-y-3 text-indigo-100 text-sm">
                        <li className="flex gap-2">
                            <span className="text-indigo-400">•</span>
                            Dealers must have a valid lifting license for the current year.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-indigo-400">•</span>
                            End Users require signed strict liability agreements for volume &gt; 10,000L.
                        </li>
                        <li className="flex gap-2">
                            <span className="text-indigo-400">•</span>
                            All PMS sales are subject to current DPR price caps.
                        </li>
                    </ul>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-3">Today's Quick Stats</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 rounded border border-green-100">
                            <div className="text-xs text-green-600 font-medium uppercase">Total Sales</div>
                            <div className="text-2xl font-bold text-green-700">12</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded border border-blue-100">
                            <div className="text-xs text-blue-600 font-medium uppercase">Volume Out</div>
                            <div className="text-2xl font-bold text-blue-700">45k L</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
