import React, { useState, useEffect } from 'react';
import { InventoryItem, ProductType, CustomerType, Customer, TransactionType, Transaction } from '../types';
import { ShoppingCart, Users, Truck, Check, Plus, X, Phone, Search, DollarSign, Scale, Printer, History } from 'lucide-react';
import { api } from '../services/api';
import { getNextInvoiceNumber, previewNextInvoiceNumber } from '../utils/invoiceGenerator';
import { printReceipt, createReceiptData } from '../utils/receiptPrinter';

interface SalesModuleProps {
    inventory: InventoryItem[];
    transactions?: Transaction[];
    onCommitTransaction: (data: any) => void;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ inventory, transactions = [], onCommitTransaction }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.DEALER);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [product, setProduct] = useState<ProductType>(ProductType.PMS);
    const [sourceId, setSourceId] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [inputMode, setInputMode] = useState<'volume' | 'amount'>('volume');
    const [refDoc, setRefDoc] = useState<string>(() => previewNextInvoiceNumber());
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

    const availableInventory = inventory.filter(i => i.product === product);

    const [currentPrice, setCurrentPrice] = useState<number>(0);

    // Fetch price when product or customer type changes
    useEffect(() => {
        const fetchPrice = async () => {
            const price = await api.prices.getPrice(product, customerType);
            setCurrentPrice(price);
        };
        fetchPrice();
    }, [product, customerType]);

    // Calculate total and volume based on input mode
    const calculatedVolume = inputMode === 'amount' && currentPrice > 0
        ? Number(amount) / currentPrice
        : Number(volume) || 0;

    const totalAmount = inputMode === 'volume'
        ? currentPrice * (Number(volume) || 0)
        : Number(amount) || 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cust = customers.find(c => c.id === selectedCustomer);

        // Get the actual invoice number (this increments the counter)
        const invoiceNumber = getNextInvoiceNumber();

        onCommitTransaction({
            type: TransactionType.SALE,
            product,
            volume: inputMode === 'volume' ? Number(volume) : calculatedVolume,
            sourceId,
            destination: cust?.name || 'External Customer',
            refDoc: invoiceNumber,
            customerId: selectedCustomer,
            customerName: cust?.name,
            unitPrice: currentPrice, // Capture price at time of sale
            totalAmount: totalAmount
        });

        // Reset form and get next invoice number preview
        setVolume('');
        setAmount('');
        setRefDoc(previewNextInvoiceNumber());
        setSourceId('');
        // Don't reset customer/product as high-frequency sales might repeat
    };

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;

        const newCustomer = await api.customers.create({
            name: newCustomerName.trim(),
            type: customerType,
            contactInfo: {
                phone: newCustomerPhone.trim() || undefined
            },
            status: 'Active',
            createdDate: new Date().toISOString(),
            totalPurchases: 0,
            averageTransactionSize: 0
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
                                    <span>{selectedCustomerDetails.contactInfo?.phone || 'No phone'}</span>
                                </div>
                                {selectedCustomerDetails.contactInfo?.email && (
                                    <div className="text-xs text-slate-500 mt-1">
                                        Email: {selectedCustomerDetails.contactInfo.email}
                                    </div>
                                )}
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
                            {inventory.length === 0 ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                                    <p className="font-medium">No tanks configured.</p>
                                    <p className="text-xs mt-1">Go to <strong>Tank Management</strong> to specific tanks first.</p>
                                </div>
                            ) : availableInventory.length === 0 ? (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                                    No active tanks with <strong>{product}</strong> stock available.
                                </div>
                            ) : (
                                <select
                                    value={sourceId}
                                    onChange={(e) => setSourceId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500"
                                >
                                    <option value="">-- Select Source --</option>
                                    {availableInventory.map(item => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                            disabled={item.currentVolume <= 0}
                                            className={item.currentVolume <= 0 ? 'text-slate-400 bg-slate-50' : ''}
                                        >
                                            {item.location} ({item.currentVolume.toLocaleString()} L)
                                            {item.currentVolume <= 0 ? ' - Empty' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Input Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setInputMode('volume'); setAmount(''); }}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${inputMode === 'volume'
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                        : 'border-slate-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <Scale className="w-4 h-4" />
                                    By Volume
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setInputMode('amount'); setVolume(''); }}
                                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm ${inputMode === 'amount'
                                        ? 'border-green-600 bg-green-50 text-green-700'
                                        : 'border-slate-200 hover:border-green-300'
                                        }`}
                                >
                                    <DollarSign className="w-4 h-4" />
                                    By Amount
                                </button>
                            </div>
                        </div>
                        <div>
                            {inputMode === 'volume' ? (
                                <>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Volume (Liters)</label>
                                    <input
                                        type="number"
                                        value={volume}
                                        onChange={(e) => setVolume(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500"
                                    />
                                </>
                            ) : (
                                <>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₦)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        min="1"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-3 py-2 border border-green-300 rounded-md focus:ring-green-500 bg-green-50"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Summary Row */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Rate</div>
                                <div className="text-lg font-bold text-slate-700">₦{currentPrice.toLocaleString()}/L</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Volume</div>
                                <div className={`text-lg font-bold ${inputMode === 'volume' ? 'text-indigo-600' : 'text-slate-700'}`}>
                                    {inputMode === 'volume'
                                        ? (Number(volume) || 0).toLocaleString()
                                        : calculatedVolume.toFixed(2)} L
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase font-medium">Total</div>
                                <div className={`text-lg font-bold ${inputMode === 'amount' ? 'text-green-600' : 'text-slate-700'}`}>
                                    ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Invoice # (Auto-generated)</label>
                        <input
                            type="text"
                            readOnly
                            value={refDoc}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-mono cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Invoice number is auto-generated with today's date</p>
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

            {/* Recent Sales History */}
            <div className="lg:col-span-2 mt-8">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-slate-500" />
                            <h3 className="font-bold text-slate-700">Recent Sales History</h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-600 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Time</th>
                                    <th className="px-4 py-3">Ref Doc</th>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Volume</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transactions
                                    .filter(t => t.type === TransactionType.SALE)
                                    .slice(0, 10) // Show last 10 sales
                                    .map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-600">
                                                {new Date(tx.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500">
                                                {tx.referenceDoc}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-800">
                                                {tx.customerName || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {tx.product}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {tx.volume.toLocaleString()} L
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    tx.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() => printReceipt(createReceiptData({
                                                        ...tx,
                                                        sourceId: tx.source // Map source to sourceId for printer compatibility
                                                    }, inventory))}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-xs font-medium transition-colors"
                                                    title="Reprint Receipt"
                                                >
                                                    <Printer className="w-3 h-3" />
                                                    Reprint
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                {transactions.filter(t => t.type === TransactionType.SALE).length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                            No recent sales found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
        </div>
    );
};
