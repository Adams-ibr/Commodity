import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { Invoice, InvoiceItem, InvoiceStatus, InvoiceType } from '../services/invoiceService';
import {
    FileText, Plus, Search, X, Check, AlertCircle, DollarSign,
    ChevronLeft, ChevronRight, Download, Send, Eye, Clock,
    CheckCircle, XCircle, Printer, CreditCard, Receipt, Repeat,
    User, Building, ShoppingCart, ArrowLeftRight
} from 'lucide-react';

interface InvoiceManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

const ITEMS_PER_PAGE = 20;

const STATUS_CONFIG: Record<InvoiceStatus, { color: string; icon: typeof FileText; label: string }> = {
    DRAFT: { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: FileText, label: 'Draft' },
    SENT: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Send, label: 'Sent' },
    PAID: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, label: 'Paid' },
    OVERDUE: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle, label: 'Overdue' },
    CANCELLED: { color: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle, label: 'Cancelled' },
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
    const [showPayment, setShowPayment] = useState<Invoice | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        type: 'SALES' as InvoiceType,
        buyerName: '',
        buyerEmail: '',
        buyerAddress: '',
        supplierName: '',
        salesContractNumber: '',
        purchaseContractNumber: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        currency: 'USD',
        taxRate: 0,
        discount: 0,
        notes: '',
        paymentTerms: 'Net 30',
    });
    const [items, setItems] = useState<InvoiceItem[]>([
        { description: '', quantity: 1, unitPrice: 0, amount: 0 }
    ]);

    useEffect(() => { loadInvoices(); }, [page, typeFilter]);
    useEffect(() => { setPage(1); }, [statusFilter, typeFilter]);

    const loadInvoices = async () => {
        setIsLoading(true);
        try {
            const res = await api.invoices.getInvoices({
                page, limit: ITEMS_PER_PAGE,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                type: typeFilter !== 'all' ? typeFilter : undefined
            });
            if (res.success && res.data) {
                setInvoices(res.data.data);
                setTotalRecords(res.data.total);
            }
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const showMsg = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    // Computed values
    const filteredInvoices = useMemo(() => {
        if (!searchTerm) return invoices;
        const q = searchTerm.toLowerCase();
        return invoices.filter(inv =>
            inv.invoiceNumber.toLowerCase().includes(q) ||
            inv.buyerName?.toLowerCase().includes(q) ||
            inv.supplierName?.toLowerCase().includes(q)
        );
    }, [invoices, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));

    const stats = useMemo(() => {
        const total = invoices.length;
        const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalPaid = invoices.reduce((s, i) => s + i.amountPaid, 0);
        const totalOutstanding = invoices.reduce((s, i) => s + i.balanceDue, 0);
        const overdue = invoices.filter(i => i.status === 'OVERDUE').length;
        return { total, totalAmount, totalPaid, totalOutstanding, overdue };
    }, [invoices]);

    // Item management
    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const updated = [...items];
        (updated[index] as any)[field] = value;
        if (field === 'quantity' || field === 'unitPrice') {
            updated[index].amount = updated[index].quantity * updated[index].unitPrice;
        }
        setItems(updated);
    };

    const addItem = () => setItems([...items, { description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    const removeItem = (i: number) => items.length > 1 && setItems(items.filter((_, idx) => idx !== i));

    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = subtotal * (formData.taxRate / 100);
    const totalAmount = subtotal + taxAmount - formData.discount;

    // Create invoice
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.some(i => !i.description || i.amount <= 0)) {
            showMsg('error', 'All items must have a description and positive amount');
            return;
        }

        const invoiceNumber = `${formData.type === 'SALES' ? 'INV' : 'BILL'}-${Date.now().toString().slice(-8)}`;
        try {
            const res = await api.invoices.createInvoice({
                companyId: '',
                type: formData.type,
                invoiceNumber,
                buyerName: formData.type === 'SALES' ? formData.buyerName : undefined,
                buyerEmail: formData.buyerEmail,
                buyerAddress: formData.buyerAddress,
                supplierName: formData.type === 'PURCHASE' ? formData.supplierName : undefined,
                salesContractNumber: formData.salesContractNumber,
                purchaseContractNumber: formData.purchaseContractNumber,
                invoiceDate: formData.invoiceDate,
                dueDate: formData.dueDate,
                items,
                subtotal,
                taxRate: formData.taxRate,
                taxAmount,
                discount: formData.discount,
                totalAmount,
                amountPaid: 0,
                balanceDue: totalAmount,
                currency: formData.currency,
                notes: formData.notes,
                paymentTerms: formData.paymentTerms,
                status: 'DRAFT' as InvoiceStatus,
                createdBy: 'system',
            });
            if (res.success) {
                showMsg('success', `${formData.type === 'SALES' ? 'Invoice' : 'Bill'} ${invoiceNumber} created`);
                onAuditLog?.('INVOICE_CREATE', `Created ${formData.type} ${invoiceNumber} for ${formData.type === 'SALES' ? formData.buyerName : formData.supplierName}`);
                setShowForm(false);
                resetForm();
                loadInvoices();
            } else {
                showMsg('error', res.error || 'Failed to create invoice');
            }
        } catch { showMsg('error', 'Failed to create invoice'); }
    };

    const resetForm = () => {
        setFormData({
            type: 'SALES',
            buyerName: '', buyerEmail: '', buyerAddress: '', supplierName: '',
            salesContractNumber: '', purchaseContractNumber: '',
            invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '',
            currency: 'USD', taxRate: 0, discount: 0, notes: '', paymentTerms: 'Net 30'
        });
        setItems([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    };

    // Status updates
    const handleStatusUpdate = async (invoice: Invoice, newStatus: InvoiceStatus) => {
        const res = await api.invoices.updateInvoice(invoice.id, { status: newStatus });
        if (res.success) {
            showMsg('success', `Invoice ${invoice.invoiceNumber} marked as ${newStatus}`);
            onAuditLog?.('INVOICE_STATUS', `Updated ${invoice.invoiceNumber} to ${newStatus}`);
            loadInvoices();
            if (showDetail?.id === invoice.id) setShowDetail({ ...invoice, status: newStatus });
        } else { showMsg('error', 'Status update failed'); }
    };

    // Record payment
    const handleRecordPayment = async () => {
        if (!showPayment || !paymentAmount || Number(paymentAmount) <= 0) return;
        const res = await api.invoices.recordPayment(showPayment.id, Number(paymentAmount), showPayment);
        if (res.success) {
            showMsg('success', `Payment of ${showPayment.currency} ${Number(paymentAmount).toLocaleString()} recorded`);
            onAuditLog?.('INVOICE_PAYMENT', `Recorded payment on ${showPayment.invoiceNumber}`);
            setShowPayment(null);
            setPaymentAmount('');
            loadInvoices();
        } else { showMsg('error', 'Payment recording failed'); }
    };

    const formatCurrency = (amount: number, currency: string = 'USD') =>
        `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatDate = (d: string | null) => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // ─── Render ──────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Receipt className="w-8 h-8 text-indigo-600" />
                        Invoice Management
                    </h2>
                    <p className="text-slate-500 mt-1">Create, track, and manage invoices and payments</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                >
                    <Plus className="w-5 h-5" />
                    New Invoice
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Invoices</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalPaid)}</p>
                        <p className="text-sm text-slate-500">Total Received</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">{formatCurrency(stats.totalOutstanding)}</p>
                        <p className="text-sm text-slate-500">Outstanding</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.overdue}</p>
                        <p className="text-sm text-slate-500">Overdue</p>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by number or entity…"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[140px]"
                >
                    <option value="all">All Types</option>
                    <option value="SALES">Sales (Receivable)</option>
                    <option value="PURCHASE">Purchase (Payable)</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[140px]"
                >
                    <option value="all">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-20">
                        <Receipt className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-700">No Invoices Found</h3>
                        <p className="text-slate-500 mt-2">Filter might be too restrictive or no data yet</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Document</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Entity</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Paid</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.map(inv => {
                                        const cfg = STATUS_CONFIG[inv.status];
                                        return (
                                            <tr key={inv.id} className="hover:bg-indigo-50/40 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${inv.type === 'SALES' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {inv.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="font-bold text-slate-800 text-sm">{inv.invoiceNumber}</div>
                                                    {(inv.salesContractNumber || inv.purchaseContractNumber) && (
                                                        <div className="text-xs text-slate-500 mt-0.5">Contract: {inv.salesContractNumber || inv.purchaseContractNumber}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm font-medium text-slate-800 flex items-center gap-1">
                                                        {inv.type === 'SALES' ? <User className="w-3 h-3 text-slate-400" /> : <Building className="w-3 h-3 text-slate-400" />}
                                                        {inv.buyerName || inv.supplierName}
                                                    </div>
                                                    {inv.buyerEmail && <div className="text-xs text-slate-500">{inv.buyerEmail}</div>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="text-sm text-slate-700">{formatDate(inv.invoiceDate)}</div>
                                                    <div className="text-xs text-slate-500">Due: {formatDate(inv.dueDate)}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="text-sm font-bold text-slate-800">{formatCurrency(inv.totalAmount, inv.currency)}</div>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="text-sm font-medium text-green-700">{formatCurrency(inv.amountPaid, inv.currency)}</div>
                                                    {inv.balanceDue > 0 && (
                                                        <div className="text-xs text-red-500">Bal: {formatCurrency(inv.balanceDue, inv.currency)}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => setShowDetail(inv)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {inv.status === 'DRAFT' && (
                                                            <button onClick={() => handleStatusUpdate(inv, 'SENT')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Mark as Sent">
                                                                <Send className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                                                            <button onClick={() => { setShowPayment(inv); setPaymentAmount(''); }} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Record Payment">
                                                                <CreditCard className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                                            <button onClick={() => handleStatusUpdate(inv, 'CANCELLED')} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                                <span className="text-sm text-slate-500">
                                    Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, totalRecords)} of {totalRecords}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">Page {page} of {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-white transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ─── Create Invoice Modal ───────────────────── */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">Create New Invoice</h3>
                                    <p className="text-indigo-200 text-sm mt-1">Add line items, tax, and payment terms</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Type Selector */}
                            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'SALES' })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'SALES' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <ShoppingCart className="w-4 h-4" /> Sales Invoice
                                </button>
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'PURCHASE' })}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'PURCHASE' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <Repeat className="w-4 h-4" /> Purchase Bill
                                </button>
                            </div>

                            {/* Entity Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {formData.type === 'SALES' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Buyer Name *</label>
                                        <input type="text" required value={formData.buyerName} onChange={e => setFormData({ ...formData, buyerName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Company Ltd" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                                        <input type="text" required value={formData.supplierName} onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="Supplier Global" />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'SALES' ? 'Buyer' : 'Supplier'} Email</label>
                                    <input type="email" value={formData.buyerEmail} onChange={e => setFormData({ ...formData, buyerEmail: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="contact@email.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{formData.type === 'SALES' ? 'Buyer' : 'Supplier'} Address</label>
                                <input type="text" value={formData.buyerAddress} onChange={e => setFormData({ ...formData, buyerAddress: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="123 Street Address" />
                            </div>
                            {/* Contracts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {formData.type === 'SALES' ? (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Sales Contract #</label>
                                        <input type="text" value={formData.salesContractNumber} onChange={e => setFormData({ ...formData, salesContractNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="SC-12345" />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Contract #</label>
                                        <input type="text" value={formData.purchaseContractNumber} onChange={e => setFormData({ ...formData, purchaseContractNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="PC-12345" />
                                    </div>
                                )}
                            </div>

                            {/* Line Items */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Line Items</label>
                                <div className="space-y-2">
                                    {items.map((item, i) => (
                                        <div key={i} className="flex gap-2 items-start">
                                            <input type="text" placeholder="Description" required value={item.description} onChange={e => updateItem(i, 'description', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                            <input type="number" placeholder="Qty" required min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                                                className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                            <input type="number" placeholder="Unit Price" required min={0} step="0.01" value={item.unitPrice || ''} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                                                className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                            <span className="w-24 py-2 text-sm font-medium text-slate-700 text-right">{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            <button type="button" onClick={() => removeItem(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Add Line Item
                                </button>
                            </div>

                            {/* Tax & Discount */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                                    <input type="number" min={0} max={100} step="0.5" value={formData.taxRate} onChange={e => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Discount</label>
                                    <input type="number" min={0} step="0.01" value={formData.discount} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-medium">{formatCurrency(subtotal, formData.currency)}</span></div>
                                {formData.taxRate > 0 && <div className="flex justify-between"><span className="text-slate-600">Tax ({formData.taxRate}%)</span><span className="font-medium">{formatCurrency(taxAmount, formData.currency)}</span></div>}
                                {formData.discount > 0 && <div className="flex justify-between"><span className="text-slate-600">Discount</span><span className="font-medium text-red-600">-{formatCurrency(formData.discount, formData.currency)}</span></div>}
                                <div className="flex justify-between border-t border-slate-300 pt-2">
                                    <span className="font-bold text-slate-800">Total</span>
                                    <span className="font-bold text-xl text-slate-800">{formatCurrency(totalAmount, formData.currency)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Additional notes or payment instructions…" />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Invoice Detail Modal ───────────────────── */}
            {showDetail && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDetail(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">{showDetail.invoiceNumber}</h3>
                                    <p className="text-slate-300 text-sm mt-1">{showDetail.buyerName}</p>
                                </div>
                                <button onClick={() => setShowDetail(null)} className="text-white/70 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="flex justify-between items-center">
                                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_CONFIG[showDetail.status].color}`}>
                                    {STATUS_CONFIG[showDetail.status].label}
                                </span>
                                <span className="text-sm text-slate-500">{formatDate(showDetail.invoiceDate)}</span>
                            </div>

                            {showDetail.buyerEmail && <p className="text-sm text-slate-600">{showDetail.buyerEmail}</p>}
                            {showDetail.buyerAddress && <p className="text-sm text-slate-500">{showDetail.buyerAddress}</p>}

                            <div className="border-t pt-3 space-y-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase">Items</h4>
                                {showDetail.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-slate-700">{item.description} <span className="text-slate-400">×{item.quantity}</span></span>
                                        <span className="font-medium">{formatCurrency(item.amount, showDetail.currency)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(showDetail.subtotal, showDetail.currency)}</span></div>
                                {showDetail.taxAmount > 0 && <div className="flex justify-between"><span>Tax ({showDetail.taxRate}%)</span><span>{formatCurrency(showDetail.taxAmount, showDetail.currency)}</span></div>}
                                {showDetail.discount > 0 && <div className="flex justify-between"><span>Discount</span><span className="text-red-600">-{formatCurrency(showDetail.discount, showDetail.currency)}</span></div>}
                                <div className="flex justify-between border-t pt-2 font-bold"><span>Total</span><span>{formatCurrency(showDetail.totalAmount, showDetail.currency)}</span></div>
                                <div className="flex justify-between text-green-700"><span>Paid</span><span>{formatCurrency(showDetail.amountPaid, showDetail.currency)}</span></div>
                                {showDetail.balanceDue > 0 && (
                                    <div className="flex justify-between text-red-600 font-bold"><span>Balance Due</span><span>{formatCurrency(showDetail.balanceDue, showDetail.currency)}</span></div>
                                )}
                            </div>

                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Due: {formatDate(showDetail.dueDate)}</span>
                                {showDetail.paymentTerms && <span>{showDetail.paymentTerms}</span>}
                            </div>
                            {showDetail.notes && <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">{showDetail.notes}</p>}

                            <div className="flex gap-2 pt-3 border-t">
                                {showDetail.status === 'DRAFT' && (
                                    <button onClick={() => { handleStatusUpdate(showDetail, 'SENT'); setShowDetail(null); }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2">
                                        <Send className="w-4 h-4" /> Mark as Sent
                                    </button>
                                )}
                                {(showDetail.status === 'SENT' || showDetail.status === 'OVERDUE') && (
                                    <button onClick={() => { setShowPayment(showDetail); setShowDetail(null); setPaymentAmount(''); }} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm flex items-center justify-center gap-2">
                                        <CreditCard className="w-4 h-4" /> Record Payment
                                    </button>
                                )}
                                <button onClick={() => setShowDetail(null)} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Payment Modal ──────────────────────────── */}
            {showPayment && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPayment(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-5 text-white">
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-6 h-6" />
                                <div>
                                    <h3 className="text-lg font-bold">Record Payment</h3>
                                    <p className="text-green-100 text-sm">{showPayment.invoiceNumber}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-3 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between"><span>Total Amount</span><span className="font-bold">{formatCurrency(showPayment.totalAmount, showPayment.currency)}</span></div>
                                <div className="flex justify-between"><span>Already Paid</span><span className="text-green-700">{formatCurrency(showPayment.amountPaid, showPayment.currency)}</span></div>
                                <div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>{formatCurrency(showPayment.balanceDue, showPayment.currency)}</span></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount ({showPayment.currency})</label>
                                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                                    min={0} max={showPayment.balanceDue} step="0.01" autoFocus required
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-bold" />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowPayment(null)} className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium">Cancel</button>
                                <button onClick={handleRecordPayment} className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm">Record Payment</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
