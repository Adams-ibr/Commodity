import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Download, Upload, Trash2, Search, Filter,
    Eye, FileSpreadsheet, FileIcon, Loader2, Plus, X,
    Calendar, CheckCircle, AlertCircle, Clock, RefreshCw
} from 'lucide-react';
import { DocumentType } from '../types_commodity';
import { api } from '../services/api';
import { DocumentRecord } from '../services/documentService';

interface DocumentManagerProps {
    referenceType?: string;
    referenceId?: string;
    title?: string;
    onAuditLog?: (action: string, details: string) => void;
}

const DOCTYPE_LABELS: Record<string, string> = {
    QUALITY_CERTIFICATE: 'Quality Certificate',
    INVOICE: 'Invoice',
    BILL_OF_LADING: 'Bill of Lading',
    PACKING_LIST: 'Packing List',
    CERTIFICATE_OF_ORIGIN: 'Certificate of Origin',
    PHYTOSANITARY_CERTIFICATE: 'Phytosanitary Cert',
    PURCHASE_CONTRACT: 'Purchase Contract',
    SALES_CONTRACT: 'Sales Contract',
    LAB_REPORT: 'Lab Report',
    EXPORT_PERMIT: 'Export Permit',
    WAYBILL: 'Waybill',
    OTHER: 'Other'
};

const DOCTYPE_COLORS: Record<string, string> = {
    QUALITY_CERTIFICATE: 'bg-emerald-100 text-emerald-700',
    INVOICE: 'bg-blue-100 text-blue-700',
    BILL_OF_LADING: 'bg-indigo-100 text-indigo-700',
    PACKING_LIST: 'bg-amber-100 text-amber-700',
    CERTIFICATE_OF_ORIGIN: 'bg-purple-100 text-purple-700',
    PHYTOSANITARY_CERTIFICATE: 'bg-green-100 text-green-700',
    PURCHASE_CONTRACT: 'bg-orange-100 text-orange-700',
    SALES_CONTRACT: 'bg-cyan-100 text-cyan-700',
    LAB_REPORT: 'bg-teal-100 text-teal-700',
    EXPORT_PERMIT: 'bg-red-100 text-red-700',
};

export const DocumentManager: React.FC<DocumentManagerProps> = ({
    referenceType = 'GLOBAL',
    referenceId = 'all',
    title = 'Document Management',
    onAuditLog
}) => {
    const [documents, setDocuments] = useState<DocumentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DocumentRecord | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Upload form state
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadDocType, setUploadDocType] = useState('INVOICE');
    const [uploadRefType, setUploadRefType] = useState('GENERAL');
    const [uploadRefId, setUploadRefId] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => { loadDocuments(); }, [referenceType, referenceId]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            let res;
            if (referenceType === 'GLOBAL') {
                res = await api.documents.getAllDocuments({});
            } else {
                res = await api.documents.getDocuments(referenceType, referenceId);
            }
            if (res.success && res.data) setDocuments(res.data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!uploadFileName.trim()) return;
        setIsUploading(true);
        try {
            const res = await api.documents.createDocument({
                companyId: '00000000-0000-0000-0000-000000000001',
                referenceType: referenceType === 'GLOBAL' ? uploadRefType : referenceType,
                referenceId: referenceType === 'GLOBAL' ? (uploadRefId || 'general') : referenceId,
                documentType: uploadDocType,
                fileName: uploadFileName,
                filePath: `documents/${uploadDocType.toLowerCase()}/${uploadFileName}`,
                fileSize: Math.floor(Math.random() * 500000) + 10000,
                mimeType: uploadFileName.endsWith('.pdf') ? 'application/pdf' :
                    uploadFileName.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                        'application/octet-stream',
                version: 1,
                uploadedBy: 'admin'
            });
            if (res.success) {
                await loadDocuments();
                setShowUploadForm(false);
                setUploadFileName('');
                setUploadDocType('INVOICE');
                setUploadRefType('GENERAL');
                setUploadRefId('');
                if (onAuditLog) onAuditLog('DOC_UPLOAD', `Uploaded document: ${uploadFileName}`);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            const res = await api.documents.deleteDocument(deleteTarget.id);
            if (res.success) {
                setDocuments(prev => prev.filter(d => d.id !== deleteTarget.id));
                if (onAuditLog) onAuditLog('DOC_DELETE', `Deleted document: ${deleteTarget.fileName} (${deleteTarget.id})`);
            }
        } catch (error) {
            console.error('Delete failed:', error);
        } finally {
            setIsDeleting(false);
            setDeleteTarget(null);
        }
    };

    const handleDownload = (doc: DocumentRecord) => {
        alert(`Downloading ${doc.fileName}... (Simulated)`);
        if (onAuditLog) onAuditLog('DOC_DOWNLOAD', `Downloaded: ${doc.fileName} (${doc.id})`);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getDocIcon = (type: string) => {
        switch (type) {
            case 'INVOICE': case 'SALES_CONTRACT': case 'PURCHASE_CONTRACT':
                return <FileText className="w-5 h-5 text-blue-500" />;
            case 'PACKING_LIST': case 'LAB_REPORT':
                return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
            case 'QUALITY_CERTIFICATE': case 'PHYTOSANITARY_CERTIFICATE':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            default:
                return <FileIcon className="w-5 h-5 text-slate-400" />;
        }
    };

    // Filter documents
    const filteredDocs = useMemo(() => {
        return documents.filter(d => {
            const matchesSearch = !searchTerm ||
                d.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.documentType.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = !filterType || d.documentType === filterType;
            return matchesSearch && matchesType;
        });
    }, [documents, searchTerm, filterType]);

    // Count by type for summary cards
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        documents.forEach(d => { counts[d.documentType] = (counts[d.documentType] || 0) + 1; });
        return counts;
    }, [documents]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded-lg">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                        <p className="text-slate-600 font-medium">{documents.length} documents • {Object.keys(typeCounts).length} categories</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadDocuments} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Refresh">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowUploadForm(true)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition shadow-sm"
                    >
                        <Plus size={20} />
                        <span>Upload Document</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {Object.keys(typeCounts).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFilterType('')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!filterType ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        All ({documents.length})
                    </button>
                    {Object.entries(typeCounts).map(([type, count]) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(filterType === type ? '' : type)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterType === type
                                ? 'bg-slate-800 text-white'
                                : (DOCTYPE_COLORS[type] || 'bg-slate-100 text-slate-600') + ' hover:opacity-80'
                                }`}
                        >
                            {DOCTYPE_LABELS[type] || type} ({count})
                        </button>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search documents by name, type, or uploader..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Document Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Document</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Reference</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Version</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Uploaded</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDocs.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 rounded-lg">
                                                {getDocIcon(doc.documentType)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-800 truncate">{doc.fileName}</p>
                                                <p className="text-xs text-slate-500">{doc.mimeType || 'unknown type'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${DOCTYPE_COLORS[doc.documentType] || 'bg-slate-100 text-slate-600'}`}>
                                            {DOCTYPE_LABELS[doc.documentType] || doc.documentType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">{doc.referenceType}</div>
                                        <div className="text-xs text-slate-400 truncate max-w-[120px]">{doc.referenceId}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{formatFileSize(doc.fileSize)}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded">
                                            <Clock className="w-3 h-3" /> v{doc.version}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-600">{doc.uploadedBy}</div>
                                        <div className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleDownload(doc)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(doc)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredDocs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                                        <p>{searchTerm || filterType ? 'No documents match your filters.' : 'No documents uploaded yet.'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-indigo-600" /> Upload Document
                            </h3>
                            <button onClick={() => setShowUploadForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">File Name *</label>
                                <input
                                    type="text"
                                    value={uploadFileName}
                                    onChange={(e) => setUploadFileName(e.target.value)}
                                    placeholder="e.g. Invoice_SC-2024-001.pdf"
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Document Type</label>
                                <select
                                    value={uploadDocType}
                                    onChange={(e) => setUploadDocType(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                >
                                    {Object.entries(DOCTYPE_LABELS).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {referenceType === 'GLOBAL' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference Type</label>
                                        <select
                                            value={uploadRefType}
                                            onChange={(e) => setUploadRefType(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                        >
                                            <option value="GENERAL">General</option>
                                            <option value="PURCHASE">Purchase Contract</option>
                                            <option value="SALES">Sales Contract</option>
                                            <option value="SHIPMENT">Shipment</option>
                                            <option value="QUALITY">Quality Test</option>
                                            <option value="COMPLIANCE">Compliance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reference ID (optional)</label>
                                        <input
                                            type="text"
                                            value={uploadRefId}
                                            onChange={(e) => setUploadRefId(e.target.value)}
                                            placeholder="e.g. contract number or shipment ID"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setShowUploadForm(false)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFileName.trim() || isUploading}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isUploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-100 rounded-full">
                                <AlertCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Delete Document</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg">
                            <p className="font-medium text-slate-800">{deleteTarget.fileName}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                {DOCTYPE_LABELS[deleteTarget.documentType] || deleteTarget.documentType} • v{deleteTarget.version} • {formatFileSize(deleteTarget.fileSize)}
                            </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
