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
    MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { Reconciliation, InventoryItem, Transaction, UserRole, ReconciliationStatus } from '../types';

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
            const results = await api.reconciliations.runDailyReconciliation(
                inventory,
                transactions,
                userName
            );
            setReconciliations(results);
            onAuditLog?.('RECONCILIATION_RUN', `Daily reconciliation completed: ${results.length} records created`);
            await loadData(); // Refresh stats
        } catch (error: any) {
            console.error('Error running reconciliation:', error);
            alert(`Reconciliation failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsRunning(false);
        }
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

    const formatVariance = (num: number) => {
        const sign = num >= 0 ? '+' : '';
        return `${sign}${formatNumber(num)}`;
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Location', 'Product', 'Opening Volume', 'Expected Volume',
            'Actual Volume', 'Variance', 'Variance %', 'Status', 'Notes', 'Reconciled By'];
        const rows = reconciliations.map(r => [
            r.date,
            r.location,
            r.product,
            r.openingVolume,
            r.expectedVolume,
            r.actualVolume,
            r.variance,
            r.variancePercent.toFixed(2) + '%',
            r.status,
            r.notes || '',
            r.reconciledBy
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reconciliation-${selectedDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const canRunReconciliation =
        userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.MANAGER;

    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    return (
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
                        <button
                            onClick={exportToCSV}
                            disabled={reconciliations.length === 0}
                            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export CSV</span>
                        </button>

                        {canRunReconciliation && isToday && (
                            <button
                                onClick={handleRunReconciliation}
                                disabled={isRunning || reconciliations.length > 0}
                                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                                <span>{isRunning ? 'Running...' : 'Run Reconciliation'}</span>
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
                        <p className="text-slate-500 mb-2">No reconciliation records for this date</p>
                        {canRunReconciliation && isToday && (
                            <button
                                onClick={handleRunReconciliation}
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                                Run reconciliation now →
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
                                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recon.status)}`}>
                                                {getStatusIcon(recon.status)}
                                                <span>{recon.status.replace('_', ' ')}</span>
                                            </span>
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
    );
};
