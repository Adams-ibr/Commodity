import React, { useState, useEffect } from 'react';
import { InventoryItem, ProductType, CustomerType, Customer, TransactionType } from '../types';
import { ShoppingCart, Users, Truck, Check, Plus, X, Phone, Search } from 'lucide-react';
import { api } from '../services/api';

interface SalesModuleProps {
    inventory: InventoryItem[];
    onCommitTransaction: (data: any) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ inventory, onCommitTransaction }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.DEALER);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [product, setProduct] = useState<ProductType>(ProductType.PMS);
    const [sourceId, setSourceId] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [refDoc, setRefDoc] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);

    // New customer form
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoadingCustomers(true);
        const data = await api.customers.getAll();
        setCustomers(data);
        setIsLoadingCustomers(false);
    };

    const availableCustomers = customers
        .filter(c => c.type === customerType)
        .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const availableInventory = inventory.filter(i => i.product === product && i.currentVolume > 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cust = customers.find(c => c.id === selectedCustomer);

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

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        const newCustomer = await api.customers.create({
            name: newCustomerName.trim(),
            type: customerType,
            contactInfo: newCustomerPhone.trim() || undefined
        });

        if (newCustomer) {
            setCustomers([...customers, newCustomer]);
            setSelectedCustomer(newCustomer.id);
            setShowAddCustomer(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
        }
    };

    const selectedCustomerDetails = customers.find(c => c.id === selectedCustomer);

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
                            onClick={() => { setCustomerType(CustomerType.DEALER); setSelectedCustomer(''); setSearchQuery(''); }}
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
                            onClick={() => { setCustomerType(CustomerType.END_USER); setSelectedCustomer(''); setSearchQuery(''); }}
                            className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${customerType === CustomerType.END_USER
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 hover:border-indigo-300'
                                }`}
                        >
                            <Users className="w-6 h-6 mb-2" />
                            <span className="font-semibold">End User</span>
                        </button>
                    </div>

                    {/* Customer Selection with Search */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-700">Select Customer</label>
                            <button
                                type="button"
                                onClick={() => setShowAddCustomer(true)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add New
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${customerType}s...`}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 text-sm"
                            />
                        </div>

                        <select
                            value={selectedCustomer}
                            onChange={(e) => setSelectedCustomer(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500"
                        >
                            <option value="">-- Select {customerType} --</option>
                            {isLoadingCustomers ? (
                                <option disabled>Loading...</option>
                            ) : availableCustomers.length === 0 ? (
                                <option disabled>No {customerType}s found</option>
                            ) : (
                                availableCustomers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))
                            )}
                        </select>

                        {/* Selected Customer Details */}
                        {selectedCustomerDetails && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone className="w-4 h-4" />
                                    <span>{selectedCustomerDetails.contactInfo || 'No phone'}</span>
                                </div>
                            </div>
                        )}
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

            {/* Add Customer Modal */}
            {showAddCustomer && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-800">
                                Add New {customerType}
                            </h3>
                            <button
                                onClick={() => setShowAddCustomer(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleAddCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Customer Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Enter customer name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={newCustomerPhone}
                                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="080-XXX-XXXX"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCustomer(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Add Customer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
                    <h3 className="font-bold text-slate-700 mb-3">Customer Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-amber-50 rounded border border-amber-100">
                            <div className="text-xs text-amber-600 font-medium uppercase">Dealers</div>
                            <div className="text-2xl font-bold text-amber-700">
                                {customers.filter(c => c.type === CustomerType.DEALER).length}
                            </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded border border-blue-100">
                            <div className="text-xs text-blue-600 font-medium uppercase">End Users</div>
                            <div className="text-2xl font-bold text-blue-700">
                                {customers.filter(c => c.type === CustomerType.END_USER).length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
