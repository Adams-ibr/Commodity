import React, { useState, useEffect } from 'react';
import {
    Calculator,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    FileText,
    Clock,
    TrendingUp,
    TrendingDown,
    ChevronLeft,
    ChevronRight,
    Download,
    MessageSquare,
    Edit2,
    X,
    Check,
    Ban
} from 'lucide-react';
import { api } from '../services/api';
import { Reconciliation, InventoryItem, Transaction, UserRole, ReconciliationStatus, TransactionType } from '../types';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelper';

interface ReconciliationModuleProps {
    userRole: UserRole;
    userName: string;
    inventory: InventoryItem[];
    transactions: Transaction[];
    onAuditLog?: (action: string, details: string) => void;
}

export const ReconciliationModule: React.FC<ReconciliationModuleProps> = ({
    userRole,
    userName,
    inventory,
    transactions,
    onAuditLog
}) => {
    const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingNotes, setEditingNotes] = useState<string | null>(null);
    const [notesValue, setNotesValue] = useState('');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualInputValues, setManualInputValues] = useState<Record<string, { posCashless: string; cashPayments: string }>>({});
    const [stats, setStats] = useState({
        totalToday: 0,
        balancedCount: 0,
        minorVarianceCount: 0,
        majorVarianceCount: 0,
        lastReconciliation: null as string | null
    });

    useEffect(() => {
        loadData();
    }, [selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [recons, statsData] = await Promise.all([
                api.reconciliations.getByDate(selectedDate),
                api.reconciliations.getStats()
            ]);
            setReconciliations(recons);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading reconciliation data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunReconciliation = async () => {
        if (isRunning) return;
        setIsRunning(true);
        try {
            // Build manual overrides map from input values
            const overrides = new Map<string, { posCashless: number; cashPayments: number }>();
            for (const itemId of Object.keys(manualInputValues)) {
                const vals = manualInputValues[itemId];
                const pos = parseFloat(vals.posCashless) || 0;
                const cash = parseFloat(vals.cashPayments) || 0;
                if (pos > 0 || cash > 0) {
                    overrides.set(itemId, { posCashless: pos, cashPayments: cash });
                }
            }

            const results = await api.reconciliations.runDailyReconciliation(
                inventory,
                transactions,
                userName,
                overrides.size > 0 ? overrides : undefined
            );
            setReconciliations(results);
            setShowManualInput(false);
            setManualInputValues({});
            onAuditLog?.('RECONCILIATION_RUN', `Daily reconciliation completed: ${results.length} records created${overrides.size > 0 ? ' (with manual POS/Cash input)' : ''}`);
            await loadData();
        } catch (error: any) {
            console.error('Error running reconciliation:', error);
            alert(`Reconciliation failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
    };

    const openManualInputForm = () => {
        // Initialize manual input values for each inventory item
        const initial: Record<string, { posCashless: string; cashPayments: string }> = {};
        inventory.forEach(item => {
            initial[item.id] = { posCashless: '', cashPayments: '' };
        });
        setManualInputValues(initial);
        setShowManualInput(true);
    };

    const updateManualInput = (itemId: string, field: 'posCashless' | 'cashPayments', value: string) => {
        setManualInputValues(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], [field]: value }
        }));
    };

    const handleSaveNotes = async (id: string) => {
        const success = await api.reconciliations.updateNotes(id, notesValue);
        if (success) {
            setReconciliations(prev =>
                prev.map(r => r.id === id ? { ...r, notes: notesValue } : r)
            );
            onAuditLog?.('RECONCILIATION_NOTE', `Note added to reconciliation: ${id}`);
        }
        setEditingNotes(null);
        setNotesValue('');
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
        const dayTransactions = transactions.filter(t =>
            t.timestamp.startsWith(selectedDate) && t.status === 'APPROVED'
        );

        const data = {
            date: selectedDate,
            reconciliations: reconciliations.map(r => ({
                ...r,
                dealerSalesAmount: r.dealerSalesAmount,
                endUserSalesVolume: r.endUserSalesVolume,
                endUserSalesAmount: r.endUserSalesAmount,
                expectedAmount: r.expectedAmount,
                posCashless: r.posCashless,
                cashPayments: r.cashPayments,
                parameters: r.parameters || ''
            })),
            sales: dayTransactions.filter(t => t.type === TransactionType.SALE),
            receipts: dayTransactions.filter(t => t.type === TransactionType.RECEIPT),
            transfers: dayTransactions.filter(t => t.type === TransactionType.TRANSFER),
            inventorySnapshot: inventory
        };

        if (format === 'csv') exportToCSV(data);
        if (format === 'excel') exportToExcel(data);
        if (format === 'pdf') exportToPDF(data);

        setShowExportMenu(false);
    };

    const getStatusIcon = (status: ReconciliationStatus) => {
        switch (status) {
            case 'BALANCED':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'VARIANCE_MINOR':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'VARIANCE_MAJOR':
                return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getStatusColor = (status: ReconciliationStatus) => {
        switch (status) {
            case 'BALANCED':
                return 'bg-green-100 text-green-800';
            case 'VARIANCE_MINOR':
                return 'bg-yellow-100 text-yellow-800';
            case 'VARIANCE_MAJOR':
                return 'bg-red-100 text-red-800';
        }
    };

    const formatNumber = (num: number) => num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    const formatCurrency = (num: number) => `₦${num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

    const formatVariance = (num: number) => {
        const sign = num >= 0 ? '+' : '';
        return `${sign}${formatNumber(num)}`;
    };

    const canRunReconciliation =
        userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.MANAGER;

    const canApproveReconciliation =
        userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.ACCOUNTANT;

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this reconciliation?')) return;
        try {
            const success = await api.reconciliations.approve(id, userName);
            if (success) {
                setReconciliations(prev => prev.map(r =>
                    r.id === id
                        ? { ...r, approvalStatus: 'APPROVED', approvedBy: userName, approvedAt: new Date().toISOString() }
                        : r
                ));
                onAuditLog?.('RECONCILIATION_APPROVE', `Approved reconciliation: ${id}`);
            }
        } catch (error) {
            console.error('Error approving:', error);
            alert('Failed to approve');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Please enter a reason for rejection:');
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
            alert('Rejection reason is required.');
            return;
        }

        try {
            const success = await api.reconciliations.reject(id, reason);
            if (success) {
                setReconciliations(prev => prev.map(r =>
                    r.id === id
                        ? { ...r, approvalStatus: 'REJECTED', rejectionReason: reason, approvedBy: undefined, approvedAt: undefined }
                        : r
                ));
                onAuditLog?.('RECONCILIATION_REJECT', `Rejected reconciliation: ${id}. Reason: ${reason}`);
            }
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Failed to reject');
        }
    };

    const handleApproveAll = async () => {
        const pending = reconciliations.filter(r => r.approvalStatus === 'PENDING');
        if (pending.length === 0) return;
        if (!confirm(`Approve all ${pending.length} pending records?`)) return;

        try {
            // Sequential for now to avoid race conditions/complexity, could be parallelized or bulk API
            for (const r of pending) {
                await api.reconciliations.approve(r.id, userName);
            }
            // Reload to get fresh state
            await loadData();
            onAuditLog?.('RECONCILIATION_APPROVE_ALL', `Bulk approved ${pending.length} records`);
        } catch (error) {
            console.error('Error bulk approving:', error);
            alert('Failed to approve all records');
        }
    };

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    return (
        <>
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Today's Records</p>
                                <p className="text-2xl font-bold text-slate-900">{stats.totalToday}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <Calculator className="w-6 h-6 text-indigo-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Balanced</p>
                                <p className="text-2xl font-bold text-green-600">{stats.balancedCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Minor Variance</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.minorVarianceCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500">Major Variance</p>
                                <p className="text-2xl font-bold text-red-600">{stats.majorVarianceCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => navigateDate('prev')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-50 rounded-lg">
                                <Calendar className="w-5 h-5 text-slate-500" />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    max={today}
                                    className="bg-transparent border-none focus:outline-none text-slate-700"
                                />
                            </div>
                            <button
                                onClick={() => navigateDate('next')}
                                disabled={selectedDate >= today}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-600" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <button
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    disabled={reconciliations.length === 0}
                                    className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Export Report</span>
                                </button>

                                {showExportMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-slate-200 py-1">
                                        <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                            Export as PDF
                                        </button>
                                        <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                            Export as Excel
                                        </button>
                                        <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                            Export as CSV
                                        </button>
                                    </div>
                                )}
                            </div>

                            {canRunReconciliation && (
                                <button
                                    onClick={openManualInputForm}
                                    disabled={isRunning}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Manual Reconciliation</span>
                                </button>
                            )}

                            {canApproveReconciliation && reconciliations.some(r => r.approvalStatus === 'PENDING') && (
                                <button
                                    onClick={handleApproveAll}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Approve All</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {stats.lastReconciliation && (
                        <div className="mt-4 flex items-center text-sm text-slate-500">
                            <Clock className="w-4 h-4 mr-2" />
                            Last reconciliation: {new Date(stats.lastReconciliation).toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Reconciliation Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                            Reconciliation Records for {new Date(selectedDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3" />
                            <p className="text-slate-500">Loading reconciliation data...</p>
                        </div>
                    ) : reconciliations.length === 0 ? (
                        <div className="p-12 text-center">
                            <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 mb-4">No reconciliation records for this date</p>
                            {canRunReconciliation && (
                                <button
                                    onClick={openManualInputForm}
                                    className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    <span>{reconciliations.length > 0 ? 'Update Reconciliation' : 'Start Manual Reconciliation'}</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Opening (L)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Expected (L)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actual (L)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Variance</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Dealer Sales (₦)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">End-user Sales (L)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">End-user Sales (₦)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Expected Amount (₦)</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">POS Cashless</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Cash Payments</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Payment Balance</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Parameters</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Variance Status</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Approval</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {reconciliations.map((recon) => (
                                        <tr key={recon.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                                {recon.location}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                                {recon.product}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatNumber(recon.openingVolume)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatNumber(recon.expectedVolume)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatNumber(recon.actualVolume)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {recon.variance !== 0 && (
                                                        recon.variance > 0
                                                            ? <TrendingUp className="w-4 h-4 text-green-500" />
                                                            : <TrendingDown className="w-4 h-4 text-red-500" />
                                                    )}
                                                    <span className={`font-mono ${recon.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatVariance(recon.variance)}
                                                    </span>
                                                    <span className="text-slate-400 text-sm">
                                                        ({recon.variancePercent.toFixed(2)}%)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatCurrency(recon.dealerSalesAmount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatNumber(recon.endUserSalesVolume)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatCurrency(recon.endUserSalesAmount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatCurrency(recon.expectedAmount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatCurrency(recon.posCashless)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600 font-mono">
                                                {formatCurrency(recon.cashPayments)}
                                            </td>
                                            {(() => {
                                                const totalSales = recon.dealerSalesAmount + recon.endUserSalesAmount;
                                                const totalCollected = recon.posCashless + recon.cashPayments;
                                                const balance = totalSales - totalCollected;
                                                return (
                                                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${Math.abs(balance) < 0.01
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {Math.abs(balance) < 0.01 ? '✓ Balanced' : formatCurrency(balance)}
                                                        </span>
                                                    </td>
                                                );
                                            })()}
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-slate-600 text-sm">
                                                {recon.parameters || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recon.status)}`}>
                                                    {getStatusIcon(recon.status)}
                                                    <span>{recon.status.replace('_', ' ')}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex flex-col items-center space-y-2">
                                                    {recon.approvalStatus === 'PENDING' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                            Pending
                                                        </span>
                                                    ) : recon.approvalStatus === 'APPROVED' ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800" title={`Approved by ${recon.approvedBy} at ${new Date(recon.approvedAt!).toLocaleString()}`}>
                                                            Approved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={`Rejected: ${recon.rejectionReason}`}>
                                                            Rejected
                                                        </span>
                                                    )}

                                                    {canApproveReconciliation && recon.approvalStatus === 'PENDING' && (
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => handleApprove(recon.id)}
                                                                className="p-1 hover:bg-green-100 text-green-600 rounded-full transition-colors"
                                                                title="Approve"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(recon.id)}
                                                                className="p-1 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                                                                title="Reject"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {editingNotes === recon.id ? (
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="text"
                                                            value={notesValue}
                                                            onChange={(e) => setNotesValue(e.target.value)}
                                                            className="border rounded px-2 py-1 text-sm w-32"
                                                            placeholder="Add note..."
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={() => handleSaveNotes(recon.id)}
                                                            className="text-indigo-600 hover:text-indigo-800 text-sm"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingNotes(null); setNotesValue(''); }}
                                                            className="text-slate-400 hover:text-slate-600 text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm text-slate-600 truncate max-w-32">
                                                            {recon.notes || '-'}
                                                        </span>
                                                        <button
                                                            onClick={() => { setEditingNotes(recon.id); setNotesValue(recon.notes || ''); }}
                                                            className="text-slate-400 hover:text-indigo-600"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Manual POS/Cash Input Modal */}
            {showManualInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Manual Reconciliation</h2>
                                <p className="text-sm text-slate-500 mt-1">Enter POS Cashless and Cash Payment amounts per tank before running reconciliation</p>
                            </div>
                            <button
                                onClick={() => { setShowManualInput(false); setManualInputValues({}); }}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="overflow-y-auto p-6 space-y-4">
                            {inventory.map(item => (
                                <div key={item.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <span className="font-semibold text-slate-900">{item.location}</span>
                                            <span className="mx-2 text-slate-300">•</span>
                                            <span className="text-slate-600">{item.product}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono">{item.currentVolume.toLocaleString()} L</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">POS Cashless (₦)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={manualInputValues[item.id]?.posCashless || ''}
                                                onChange={(e) => updateManualInput(item.id, 'posCashless', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Cash Payments (₦)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={manualInputValues[item.id]?.cashPayments || ''}
                                                onChange={(e) => updateManualInput(item.id, 'cashPayments', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                            <button
                                onClick={() => { setShowManualInput(false); setManualInputValues({}); }}
                                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRunReconciliation}
                                disabled={isRunning}
                                className="flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                                <span>{isRunning ? 'Running Reconciliation...' : (reconciliations.length > 0 ? 'Update Reconciliation' : 'Run Reconciliation')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
