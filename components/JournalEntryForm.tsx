import React, { useState, useEffect } from 'react';
import {
    Save, X, Plus, Trash2,
    AlertCircle, CheckCircle2, History,
    Link as LinkIcon, Loader2
} from 'lucide-react';
import {
    Account, JournalEntry, JournalEntryLine,
    JournalEntryStatus
} from '../types_commodity';
import { api } from '../services/api';

interface JournalEntryFormProps {
    onSuccess?: (entry: JournalEntry) => void;
    onCancel?: () => void;
    onAuditLog?: (action: string, details: string) => void;
}

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
    onSuccess,
    onCancel,
    onAuditLog
}) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<Omit<JournalEntryLine, 'id' | 'journalEntryId' | 'createdAt'>[]>([
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '', lineNumber: 1 },
        { accountId: '', debitAmount: 0, creditAmount: 0, description: '', lineNumber: 2 }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        const res = await api.accounting.getAccounts();
        if (res.success && res.data) {
            setAccounts(res.data);
        }
    };

    const addLine = () => {
        setLines([...lines, {
            accountId: '',
            debitAmount: 0,
            creditAmount: 0,
            description: '',
            lineNumber: lines.length + 1
        }]);
    };

    const removeLine = (index: number) => {
        if (lines.length <= 2) return;
        const newLines = lines.filter((_, i) => i !== index);
        setLines(newLines.map((l, i) => ({ ...l, lineNumber: i + 1 })));
    };

    const updateLine = (index: number, field: keyof typeof lines[0], value: any) => {
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // If updating debit, zero out credit and vice versa
        if (field === 'debitAmount' && value > 0) newLines[index].creditAmount = 0;
        if (field === 'creditAmount' && value > 0) newLines[index].debitAmount = 0;

        setLines(newLines);
    };

    const totalDebit = lines.reduce((sum, l) => sum + l.debitAmount, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.creditAmount, 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.001 && totalDebit > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isBalanced) {
            setError('Entry must be balanced (Debits = Credits) and have at least one amount.');
            return;
        }

        if (lines.some(l => !l.accountId)) {
            setError('All lines must have an account selected.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const res = await api.accounting.createJournalEntry(
            {
                companyId: '', // Set by service
                entryDate: date,
                description,
                status: JournalEntryStatus.DRAFT,
                createdBy: 'system' // Replace with actual user
            },
            lines
        );

        if (res.success && res.data) {
            if (onAuditLog) {
                onAuditLog('ACC_JOURNAL_CREATE', `Created journal entry: ${res.data.entryNumber}`);
            }
            if (onSuccess) onSuccess(res.data);
        } else {
            setError(res.error || 'Failed to create entry');
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden max-w-4xl mx-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    New Journal Entry
                </h3>
                {onCancel && (
                    <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Entry Date</label>
                        <input
                            type="date"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Memo / Description</label>
                        <input
                            type="text"
                            placeholder="e.g., Initial stock purchase"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Entry Lines</label>
                        <button
                            type="button"
                            onClick={addLine}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Line
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-slate-500 font-bold uppercase tracking-wider">
                                    <th className="pb-2 pl-2">Account</th>
                                    <th className="pb-2 px-2 w-32">Debit</th>
                                    <th className="pb-2 px-2 w-32">Credit</th>
                                    <th className="pb-2 px-2">Memo</th>
                                    <th className="pb-2 pr-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lines.map((line, idx) => (
                                    <tr key={idx} className="group">
                                        <td className="py-2 pr-2">
                                            <select
                                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={line.accountId}
                                                onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
                                                required
                                            >
                                                <option value="">Select Account...</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.accountCode} - {acc.accountName}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                                value={line.debitAmount || ''}
                                                onChange={(e) => updateLine(idx, 'debitAmount', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-rose-500/20 outline-none"
                                                value={line.creditAmount || ''}
                                                onChange={(e) => updateLine(idx, 'creditAmount', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="py-2 px-2">
                                            <input
                                                type="text"
                                                placeholder="Optional note"
                                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                                value={line.description}
                                                onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 pl-2">
                                            {lines.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(idx)}
                                                    className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50/50">
                                    <td className="py-3 pl-4 text-xs font-bold text-slate-500 uppercase">Totals</td>
                                    <td className={`py-3 px-2 text-sm font-bold text-right ${totalDebit === totalCredit && totalDebit > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className={`py-3 px-2 text-sm font-bold text-right ${totalDebit === totalCredit && totalCredit > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td colSpan={2} className="py-3 px-2">
                                        {totalDebit > 0 && (
                                            <div className="flex items-center justify-end gap-2">
                                                {isBalanced ? (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Balanced</span>
                                                ) : (
                                                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Out of Balance: {diff.toLocaleString()}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-500 italic">
                    Draft entries do not affect financial statements until posted.
                </div>
                <div className="flex items-center gap-3">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={!isBalanced || isSubmitting}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition-all shadow-sm
              ${isBalanced && !isSubmitting
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        Save Entry
                    </button>
                </div>
            </div>
        </form>
    );
};
