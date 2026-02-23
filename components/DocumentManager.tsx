import React, { useState, useEffect } from 'react';
import {
    FileText, Download, Upload, Trash2,
    Eye, FileSpreadsheet, FileIcon, Loader2
} from 'lucide-react';
import { Document, DocumentType } from '../types_commodity';
import { api } from '../services/api';

interface DocumentManagerProps {
    referenceType: string;
    referenceId: string;
    title?: string;
    onAuditLog?: (action: string, details: string) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
    referenceType,
    referenceId,
    title = 'Documents & Attachments',
    onAuditLog
}) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        loadDocuments();
    }, [referenceId]);

    const loadDocuments = async () => {
        setIsLoading(true);
        try {
            const res = await api.documents.getDocuments(referenceType, referenceId);
            if (res.success && res.data) {
                setDocuments(res.data);
            }
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (doc: Document) => {
        // In a real app, this would trigger a download from Supabase storage or a blob
        alert(`Downloading ${doc.fileName}... (Simulated)`);
        if (onAuditLog) {
            onAuditLog('DOC_DOWNLOAD', `Downloaded document: ${doc.fileName} (${doc.id})`);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getDocIcon = (type: DocumentType) => {
        switch (type) {
            case DocumentType.INVOICE:
            case DocumentType.SALES_CONTRACT:
            case DocumentType.PURCHASE_CONTRACT:
                return <FileText className="w-5 h-5 text-blue-500" />;
            case DocumentType.PACKING_LIST:
                return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
            default:
                return <FileIcon className="w-5 h-5 text-slate-400" />;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">{title}</h3>
                <button
                    onClick={() => alert('Manual upload coming soon...')}
                    className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <Upload className="w-4 h-4" />
                    Upload
                </button>
            </div>

            <div className="divide-y divide-slate-50">
                {documents.map((doc) => (
                    <div key={doc.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="p-2 bg-slate-100 rounded-lg">
                                {getDocIcon(doc.documentType)}
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-slate-800 truncate">{doc.fileName}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-2">
                                    <span>{doc.documentType.replace('_', ' ')}</span>
                                    <span>•</span>
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDownload(doc)}
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Download"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                            <button
                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {documents.length === 0 && (
                    <div className="px-6 py-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                        <p>No documents found for this record.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
