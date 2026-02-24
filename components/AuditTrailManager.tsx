import React, { useState, useEffect, useMemo } from 'react';
import {
    Shield, Search, Download, RefreshCw, ChevronLeft, ChevronRight,
    Filter, Clock, User, Activity, Loader2, FileText, Calendar
} from 'lucide-react';
import { api, AuditLogEntry } from '../services/api';

const ACTION_COLORS: Record<string, string> = {
    // Documents
    DOC_UPLOAD: 'bg-blue-100 text-blue-700',
    DOC_DOWNLOAD: 'bg-cyan-100 text-cyan-700',
    DOC_DELETE: 'bg-red-100 text-red-700',
    // Auth
    LOGIN: 'bg-emerald-100 text-emerald-700',
    LOGOUT: 'bg-slate-100 text-slate-600',
    // General
    CREATE: 'bg-green-100 text-green-700',
    UPDATE: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    GENERATE_INVOICE: 'bg-purple-100 text-purple-700',
    GENERATE_WAYBILL: 'bg-indigo-100 text-indigo-700',
};

function getActionColor(action: string): string {
    if (ACTION_COLORS[action]) return ACTION_COLORS[action];
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-100 text-green-700';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-amber-100 text-amber-700';
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'bg-red-100 text-red-700';
    if (action.includes('GENERATE')) return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
}

const PAGE_SIZE = 50;

export const AuditTrailManager: React.FC = () => {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        loadLogs();
    }, [currentPage, filterAction, filterDate]);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const res = await api.audit.search({
                query: searchTerm || undefined,
                action: filterAction || undefined,
                date: filterDate || undefined,
                page: currentPage,
                limit: PAGE_SIZE
            });
            setLogs(res.data);
            setTotalCount(res.count);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        loadLogs();
    };

    const handleExport = () => {
        const csv = api.audit.exportCSV(logs);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${filterDate || 'all'}_page${currentPage}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Unique actions for filter dropdown
    const uniqueActions = useMemo(() => {
        const actions = new Set(logs.map(l => l.action));
        return Array.from(actions).sort();
    }, [logs]);

    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    const formatTime = (ts: string) => {
        const d = new Date(ts);
        return d.toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Client-side search filtering
    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const q = searchTerm.toLowerCase();
        return logs.filter(l =>
            l.action.toLowerCase().includes(q) ||
            l.details.toLowerCase().includes(q) ||
            l.user.toLowerCase().includes(q)
        );
    }, [logs, searchTerm]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Audit Trail</h2>
                        <p className="text-slate-600 font-medium">{totalCount} total logs • Page {currentPage} of {totalPages}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadLogs} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={logs.length === 0}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition shadow-sm disabled:opacity-50"
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by action, user, or details..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                            className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
                        />
                    </div>
                    <select
                        value={filterAction}
                        onChange={(e) => { setFilterAction(e.target.value); setCurrentPage(1); }}
                        className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(a => (
                            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                        ))}
                    </select>
                    {(filterDate || filterAction || searchTerm) && (
                        <button
                            onClick={() => { setFilterDate(''); setFilterAction(''); setSearchTerm(''); setCurrentPage(1); }}
                            className="px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Log Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Details</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <span className="whitespace-nowrap">{formatTime(log.timestamp)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full whitespace-nowrap ${getActionColor(log.action)}`}>
                                                {log.action.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-700 max-w-md truncate" title={log.details}>
                                                {log.details}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-700">{log.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                {log.role}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                            <Shield className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                            <p>No audit logs found for the selected filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                                if (pageNum > totalPages) return null;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum
                                            ? 'bg-slate-800 text-white'
                                            : 'text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
