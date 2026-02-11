import React, { useState, useEffect } from 'react';
import { InventoryItem, ProductType, CustomerType, Customer, TransactionType, Transaction, UserRole, hasPermission } from '../types';
import { ShoppingCart, Users, Truck, Check, Plus, X, Phone, Search, DollarSign, Scale, Printer, History, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { getTodayDateString } from '../utils/invoiceGenerator';
import { printReceipt, createReceiptData } from '../utils/receiptPrinter';

interface SalesModuleProps {
    inventory: InventoryItem[];
    transactions?: Transaction[];
    onCommitTransaction: (data: any) => void;
    onDeleteTransaction?: (id: string) => void;
    userRole?: UserRole;
}

export const SalesModule: React.FC<SalesModuleProps> = ({ inventory, transactions = [], onCommitTransaction, onDeleteTransaction, userRole }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
    const [customerType, setCustomerType] = useState<CustomerType>(CustomerType.DEALER);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('');
    const [product, setProduct] = useState<ProductType>(ProductType.PMS);
    const [sourceId, setSourceId] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [inputMode, setInputMode] = useState<'volume' | 'amount'>('volume');
    const [refDoc, setRefDoc] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddCustomer, setShowAddCustomer] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Date Filter State
    const [dateFilter, setDateFilter] = useState<'recent' | 'today' | 'week' | 'month' | 'year' | 'all'>('recent');

    // New customer form
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerPhone, setNewCustomerPhone] = useState('');

    useEffect(() => {
        loadCustomers();

        // Sync invoice preview from counter table
        const syncInvoice = async () => {
            const todayStr = getTodayDateString();
            const currentSeq = await api.transactions.getCurrentInvoiceSeq(todayStr);
            const nextSeq = currentSeq + 1;
            setRefDoc(`INV-${todayStr}-${String(nextSeq).padStart(4, '0')}`);
        };
        syncInvoice();
    }, []);

    const loadCustomers = async () => {
        setIsLoadingCustomers(true);
        const data = await api.customers.getAll();
        setCustomers(data);
        setIsLoadingCustomers(false);
    };

    const availableCustomers = customers
        .filter(c => c.type === customerType)
        .filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.contactInfo?.phone && c.contactInfo.phone.includes(searchQuery))
        );

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cust = customers.find(c => c.id === selectedCustomer);

        // Pass datePrefix instead of pre-generated invoice number
        // The API will generate the invoice number atomically during insert
        // This prevents duplicate invoice numbers in concurrent scenarios
        const todayStr = getTodayDateString();

        onCommitTransaction({
            type: TransactionType.SALE,
            product,
            volume: inputMode === 'volume' ? Number(volume) : calculatedVolume,
            sourceId,
            destination: cust?.name || 'External Customer',
            datePrefix: todayStr, // API will generate unique invoice number
            customerId: selectedCustomer,
            customerName: cust?.name,
            unitPrice: currentPrice, // Capture price at time of sale
            totalAmount: totalAmount
        });

        // Reset form
        setVolume('');
        setAmount('');
        setSourceId('');

        // Update invoice preview immediately from counter table
        // Small delay only to allow the insert to complete
        setTimeout(async () => {
            const currentSeq = await api.transactions.getCurrentInvoiceSeq(todayStr);
            const nextSeq = currentSeq + 1;
            const nextPreview = `INV-${todayStr}-${String(nextSeq).padStart(4, '0')}`;
            setRefDoc(nextPreview);
        }, 200);
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
            setSearchQuery(newCustomer.name);
            setShowAddCustomer(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
        }
    };

    // Filter sales based on selected date range
    const getFilteredSales = () => {
        const sales = transactions.filter(t => t.type === TransactionType.SALE);
        const now = new Date();

        switch (dateFilter) {
            case 'today': {
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return sales.filter(t => new Date(t.timestamp) >= startOfDay);
            }
            case 'week': {
                // Start of current week (Monday)
                const d = new Date(now);
                const day = d.getDay();
                const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const monday = new Date(d.setDate(diff));
                monday.setHours(0, 0, 0, 0);
                return sales.filter(t => new Date(t.timestamp) >= monday);
            }
            case 'month': {
                return sales.filter(t => {
                    const d = new Date(t.timestamp);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                });
            }
            case 'year': {
                return sales.filter(t => new Date(t.timestamp).getFullYear() === now.getFullYear());
            }
            case 'all':
                return sales;
            case 'recent':
            default:
                return sales.slice(0, 10);
        }
    };

    const filteredSales = getFilteredSales();
    const selectedCustomerDetails = customers.find(c => c.id === selectedCustomer);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sales Entry Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                                <h3 className="font-bold text-slate-700">New Sale Entry</h3>
                            </div>
                            <div className="text-sm font-mono bg-slate-100 px-3 py-1 rounded text-slate-600">
                                {refDoc || 'Generating Invoice...'}
                            </div>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* Customer Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                type="button"
                                                onClick={() => { setCustomerType(CustomerType.DEALER); setSelectedCustomer(''); }}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded border ${customerType === CustomerType.DEALER ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                Dealer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setCustomerType(CustomerType.END_USER); setSelectedCustomer(''); }}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded border ${customerType === CustomerType.END_USER ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                            >
                                                End User
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <div
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md flex items-center justify-between cursor-pointer bg-white"
                                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            >
                                                <span className={selectedCustomer ? 'text-slate-900' : 'text-slate-400'}>
                                                    {selectedCustomer
                                                        ? customers.find(c => c.id === selectedCustomer)?.name
                                                        : 'Select Customer...'}
                                                </span>
                                                <Search className="w-4 h-4 text-slate-400" />
                                            </div>

                                            {isDropdownOpen && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                    <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
                                                        <input
                                                            type="text"
                                                            placeholder="Search customers..."
                                                            className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                                                            value={searchQuery}
                                                            onChange={(e) => setSearchQuery(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>

                                                    {isLoadingCustomers ? (
                                                        <div className="p-4 text-center text-xs text-slate-400">Loading...</div>
                                                    ) : availableCustomers.length === 0 ? (
                                                        <div className="p-4 text-center text-xs text-slate-500">
                                                            No customers found.
                                                            <button
                                                                type="button"
                                                                onClick={() => { setShowAddCustomer(true); setIsDropdownOpen(false); }}
                                                                className="text-indigo-600 hover:text-indigo-800 ml-1 font-medium"
                                                            >
                                                                Add New?
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        availableCustomers.map(customer => (
                                                            <div
                                                                key={customer.id}
                                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex justify-between items-center ${selectedCustomer === customer.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
                                                                onClick={() => {
                                                                    setSelectedCustomer(customer.id);
                                                                    setIsDropdownOpen(false);
                                                                    setSearchQuery('');
                                                                }}
                                                            >
                                                                <span>{customer.name}</span>
                                                                {customer.contactInfo?.phone && (
                                                                    <span className="text-xs text-slate-400">{customer.contactInfo.phone}</span>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                                        <select
                                            value={product}
                                            onChange={(e) => {
                                                setProduct(e.target.value as ProductType);
                                                setSourceId('');
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {Object.values(ProductType).map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Source Tank */}
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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

                                    {/* Volume/Amount Input */}
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="block text-sm font-medium text-slate-700">Quantity</label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => { setInputMode('volume'); setAmount(''); }}
                                                    className={`text-xs px-2 py-0.5 rounded ${inputMode === 'volume' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    By Liters
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setInputMode('amount'); setVolume(''); }}
                                                    className={`text-xs px-2 py-0.5 rounded ${inputMode === 'amount' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    By Amount
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                required
                                                value={inputMode === 'volume' ? volume : amount}
                                                onChange={(e) => inputMode === 'volume' ? setVolume(e.target.value) : setAmount(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pl-8"
                                                placeholder={inputMode === 'volume' ? "0.00" : "0.00"}
                                            />
                                            <div className="absolute left-3 top-2.5 text-slate-400">
                                                {inputMode === 'volume' ? <Scale className="w-4 h-4" /> : <span className="text-xs font-bold">₦</span>}
                                            </div>
                                            <div className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                                                {inputMode === 'volume'
                                                    ? `≈ ₦${(Number(volume || 0) * currentPrice).toLocaleString()}`
                                                    : `≈ ${(Number(amount || 0) / (currentPrice || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })} L`
                                                }
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Current Rate: <span className="font-mono font-medium text-slate-700">₦{currentPrice}/L</span>
                                        </p>
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

                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!selectedCustomer || !sourceId || (!volume && !amount)}
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Complete Sale
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Quick Stats Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            Active Products
                        </h4>
                        <div className="space-y-3">
                            {inventory.map(item => (
                                <div key={item.id} className="group">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600">{item.product.split(' ')[0]}</span>
                                        <span className="font-mono text-slate-800">{item.currentVolume.toLocaleString()}L</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${item.currentVolume < item.minThreshold ? 'bg-red-500' : 'bg-green-500'
                                                }`}
                                            style={{ width: `${Math.min((item.currentVolume / item.maxCapacity) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                        <h4 className="font-medium text-slate-700 mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Customer Overview
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Dealers</div>
                                <div className="text-2xl font-bold text-slate-800">
                                    {customers.filter(c => c.type === CustomerType.DEALER).length}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg text-center">
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">End Users</div>
                                <div className="text-2xl font-bold text-slate-800">
                                    {customers.filter(c => c.type === CustomerType.END_USER).length}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Sales History */}
            <div className="lg:col-span-2 mt-8">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-slate-500" />
                            <h3 className="font-bold text-slate-700">Sales History</h3>
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            {(['recent', 'today', 'week', 'month', 'year', 'all'] as const).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dateFilter === filter
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                                </button>
                            ))}
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
                                {filteredSales.map(tx => (
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => printReceipt(createReceiptData({
                                                        ...tx,
                                                        sourceId: tx.source,
                                                        refDoc: tx.referenceDoc
                                                    }, inventory))}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-xs font-medium transition-colors"
                                                    title="Reprint Receipt"
                                                >
                                                    <Printer className="w-3 h-3" />
                                                    Reprint
                                                </button>
                                                {userRole && hasPermission(userRole, 'delete_transactions') && onDeleteTransaction && (
                                                    <button
                                                        onClick={() => onDeleteTransaction(tx.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-medium transition-colors"
                                                        title="Delete Transaction"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSales.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                                            No sales found for the selected period.
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
