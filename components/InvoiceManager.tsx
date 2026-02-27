import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { Invoice, InvoiceItem, InvoiceStatus, InvoiceType } from '../services/invoiceService';
import {
    FileText, Plus, Search, X, Check, AlertCircle, DollarSign,
    ChevronLeft, ChevronRight, Download, Send, Eye, Clock,
    CheckCircle, XCircle, Printer, CreditCard, Receipt, Repeat,
    User, Building, ShoppingCart, ArrowLeftRight, Package, Layers
} from 'lucide-react';
import { SalesContract, PurchaseContract, Buyer, Supplier, CommodityType } from '../types_commodity';

interface InvoiceManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

const ITEMS_PER_PAGE = 20;

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; icon: any; label: string }> = {
    DRAFT: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText, label: 'Draft' },
    SENT: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Send, label: 'Sent' },
    PAID: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle, label: 'Paid' },
    OVERDUE: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertCircle, label: 'Overdue' },
    CANCELLED: { color: 'bg-slate-50 text-slate-400 border-slate-100', icon: XCircle, label: 'Cancelled' },
};

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({ userRole, onAuditLog }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<InvoiceType | 'all'>('all');
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState<Invoice | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [salesContracts, setSalesContracts] = useState<SalesContract[]>([]);
    const [purchaseContracts, setPurchaseContracts] = useState<PurchaseContract[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [commodityTypes, setCommodityTypes] = useState<CommodityType[]>([]);

    const [formData, setFormData] = useState({
        type: 'SALES' as InvoiceType,
        buyerId: '', buyerName: '', buyerEmail: '', buyerAddress: '',
        supplierId: '', supplierName: '',
        salesContractId: '', salesContractNumber: '',
        purchaseContractId: '', purchaseContractNumber: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        currency: 'USD', taxRate: 0, discount: 0, notes: '', paymentTerms: 'Net 30',
    });
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 0, unitPrice: 0, amount: 0 }]);

    useEffect(() => { loadInvoices(); }, [page, typeFilter, statusFilter]);
    useEffect(() => { if (showForm) loadReferenceData(); }, [showForm]);

    const loadReferenceData = async () => {
        try {
            const [sc, pc, b, s, ct] = await Promise.all([
                api.sales.getSalesContracts({ limit: 1000, includeItems: true }),
                api.procurement.getPurchaseContracts({ includeItems: true }),
                api.sales.getBuyers(),
                api.procurement.getSuppliers(),
                api.commodityMaster.getCommodityTypes()
            ]);
            if (sc.success) setSalesContracts(sc.data?.data || []);
            if (pc.success) setPurchaseContracts(pc.data?.data || []);
            if (b.success) setBuyers(b.data || []);
            if (s.success) setSuppliers(s.data || []);
            if (ct.success) setCommodityTypes(ct.data || []);
        } catch (e) { console.error(e); }
    };

    const loadInvoices = async () => {
        setIsLoading(true);
        try {
            const res = await api.invoices.getInvoices({
                page, limit: ITEMS_PER_PAGE,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined
            });
            if (res.success && res.data) {
                setInvoices(res.data.data || []);
                setTotalRecords(res.data.total || 0);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handleContractSelection = (id: string, type: 'SALES' | 'PURCHASE') => {
        if (!id) return;
        if (type === 'SALES') {
            const contract = salesContracts.find(c => c.id === id);
            if (!contract) return;
            const buyer = buyers.find(b => b.id === contract.buyerId);
            setFormData(prev => ({
                ...prev,
                salesContractId: contract.id,
                salesContractNumber: contract.contractNumber,
                buyerId: contract.buyerId,
                buyerName: buyer?.name || '',
                buyerEmail: buyer?.email || '',
                currency: contract.currency
            }));
            const contractItems = (contract as any).items || [];
            setItems(contractItems.map((item: any) => ({
                description: `${commodityTypes.find(ct => ct.id === item.commodityTypeId)?.name || 'Commodity'} - ${item.grade || 'Std'}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                salesContractItemId: item.id
            })));
        } else {
            const contract = purchaseContracts.find(c => c.id === id);
            if (!contract) return;
            const supplier = suppliers.find(s => s.id === contract.supplierId);
            setFormData(prev => ({
                ...prev,
                purchaseContractId: contract.id,
                purchaseContractNumber: contract.contractNumber,
                supplierId: contract.supplierId,
                supplierName: supplier?.name || '',
                currency: contract.currency
            }));
            const contractItems = (contract as any).items || [];
            setItems(contractItems.map((item: any) => ({
                description: `${commodityTypes.find(ct => ct.id === item.commodityTypeId)?.name || 'Commodity'} - ${item.grade || 'Std'}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                purchaseContractItemId: item.id
            })));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const subtotal = items.reduce((s, i) => s + i.amount, 0);
        const taxAmount = subtotal * (formData.taxRate / 100);
        const totalAmount = subtotal + taxAmount - formData.discount;

        try {
            const res = await api.invoices.createInvoice({
                ...formData,
                items,
                subtotal,
                taxAmount,
                totalAmount,
                amountPaid: 0,
                balanceDue: totalAmount,
                status: 'DRAFT',
                createdBy: 'system'
            });
            if (res.success) {
                setShowForm(false);
                loadInvoices();
                if (onAuditLog) onAuditLog('INVOICE_CREATE', `Created invoice for ${formData.salesContractNumber || formData.purchaseContractNumber}`);
            } else {
                alert(res.error || 'Failed to create');
            }
        } catch (e) { console.error(e); }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            newItems[index].amount = newItems[index].quantity * newItems[index].unitPrice;
        }
        setItems(newItems);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Financial Clearing</h2>
                    <p className="text-slate-500 font-medium">Link trade agreements to billing and receivables</p>
                </div>
                <button
                    onClick={() => { setShowForm(true); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold"
                >
                    <Plus size={20} />
                    <span>Issue Invoice</span>
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value as any)}
                    className="px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none"
                >
                    <option value="all">All Types</option>
                    <option value="SALES">Receivables</option>
                    <option value="PURCHASE">Payables</option>
                </select>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Info</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Trade</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoices.filter(i => i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())).map(invoice => (
                            <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="font-black text-slate-900 mb-1">{invoice.invoiceNumber}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{invoice.buyerName || invoice.supplierName}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-3 h-3 text-indigo-500" />
                                        <div className="text-sm font-black text-slate-700 uppercase">{invoice.salesContractNumber || invoice.purchaseContractNumber || 'No Link'}</div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="font-black text-slate-900">{invoice.currency} {invoice.totalAmount.toLocaleString()}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase italic">Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <span className={`inline-flex px-3 py-1 text-[10px] font-black rounded-full border border-dashed ${STATUS_CONFIG[invoice.status].color}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button onClick={() => setShowDetail(invoice)} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all">
                                        <Eye className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-100 transition-all animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 text-white">
                                    <Receipt className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Issue New Instrument</h3>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreate} className="p-10 overflow-y-auto space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2 border border-slate-100">
                                        <button type="button" onClick={() => setFormData({ ...formData, type: 'SALES' })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'SALES' ? 'bg-white shadow-xl text-indigo-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                                            Receivable
                                        </button>
                                        <button type="button" onClick={() => setFormData({ ...formData, type: 'PURCHASE' })}
                                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.type === 'PURCHASE' ? 'bg-white shadow-xl text-emerald-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>
                                            Payable
                                        </button>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Linked Contract Authorization *</label>
                                        <select
                                            value={formData.type === 'SALES' ? formData.salesContractId : formData.purchaseContractId}
                                            onChange={e => handleContractSelection(e.target.value, formData.type)}
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-50 focus:bg-white transition-all shadow-sm"
                                        >
                                            <option value="">Select ACTIVE contract...</option>
                                            {formData.type === 'SALES'
                                                ? salesContracts.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.contractNumber} — {c.buyerId}</option>)
                                                : purchaseContracts.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.contractNumber} — {c.supplierId}</option>)
                                            }
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Issue Date</label>
                                            <input type="date" value={formData.invoiceDate} onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })} className="w-full bg-white border border-slate-100 px-4 py-3 rounded-xl font-bold text-slate-800 outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                                            <input type="date" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} className="w-full bg-white border border-slate-100 px-4 py-3 rounded-xl font-bold text-slate-800 outline-none shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-indigo-500" /> Line Item Decoupling
                                </h4>
                                <div className="space-y-3">
                                    {items.map((item, i) => (
                                        <div key={i} className="flex gap-4 p-4 bg-slate-50/50 rounded-2xl items-center border border-slate-50 transition-all hover:bg-white hover:border-slate-200">
                                            <div className="flex-1">
                                                <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-800" placeholder="Item description..." />
                                                <div className="text-[10px] font-black text-slate-300 uppercase mt-1">Contract ID: {item.salesContractItemId || item.purchaseContractItemId || 'SPOT'}</div>
                                            </div>
                                            <div className="w-24 px-4 py-2 bg-white rounded-xl border border-slate-100 border-dashed">
                                                <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Quantity</div>
                                                <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="w-full bg-transparent outline-none font-black text-slate-800" />
                                            </div>
                                            <div className="w-32 px-4 py-2 bg-white rounded-xl border border-slate-100 border-dashed">
                                                <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Price</div>
                                                <input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} className="w-full bg-transparent outline-none font-black text-slate-800" />
                                            </div>
                                            <div className="w-32 text-right">
                                                <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Subtotal</div>
                                                <div className="font-black text-slate-900">{formData.currency} {item.amount.toLocaleString()}</div>
                                            </div>
                                            <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><X size={18} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setItems([...items, { description: '', quantity: 0, unitPrice: 0, amount: 0 }])} className="w-full py-4 border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-100 hover:text-indigo-400 transition-all">+ Add Supplemental Charge</button>
                                </div>
                            </div>
                        </form>

                        <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Clearing Value</div>
                                    <div className="text-3xl font-black text-slate-900">{formData.currency} {(items.reduce((s, i) => s + i.amount, 0) + (items.reduce((s, i) => s + i.amount, 0) * (formData.taxRate / 100)) - formData.discount).toLocaleString()}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-600 transition-colors">Abort</button>
                                <button onClick={handleCreate} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all">Authorize Instrument</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
