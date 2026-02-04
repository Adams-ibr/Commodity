import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { parseCustomerExcel, ParseResult } from '../utils/excelParser';
import { Customer } from '../types';
import { api } from '../services/api';

interface CustomerImportModalProps {
    onClose: () => void;
    onImportComplete: () => void;
}

export const CustomerImportModal: React.FC<CustomerImportModalProps> = ({ onClose, onImportComplete }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<ParseResult | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (selectedFile: File) => {
        if (!selectedFile) return;

        // Check file type
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
            alert('Please upload a valid Excel file (.xlsx or .xls)');
            return;
        }

        setFile(selectedFile);
        setIsParsing(true);
        setImportResult(null);

        try {
            const result = await parseCustomerExcel(selectedFile);
            setParsedData(result);
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Failed to parse Excel file.');
            setFile(null);
        } finally {
            setIsParsing(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleImport = async () => {
        if (!parsedData || parsedData.customers.length === 0) return;

        setIsImporting(true);
        try {
            const result = await api.customers.bulkCreate(parsedData.customers);
            setImportResult(result);
            if (result.success > 0) {
                onImportComplete();
            }
        } catch (error) {
            console.error('Import failed:', error);
            alert('Import failed. Please try again.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                        <h2 className="text-xl font-bold text-gray-800">Import Customers</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {!importResult ? (
                        <>
                            {/* File Upload Area */}
                            {!parsedData ? (
                                <div
                                    className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls"
                                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                                    />

                                    {isParsing ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                            <p className="text-gray-600">Parsing Excel file...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <Upload className="w-12 h-12 text-gray-400" />
                                            <div className="space-y-1">
                                                <p className="text-lg font-medium text-gray-700">Drag and drop your Excel file here</p>
                                                <p className="text-sm text-gray-500">or</p>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
                                                >
                                                    browse to upload
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">Supported formats: .xlsx, .xls</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <FileSpreadsheet className="w-8 h-8 text-green-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">{file?.name}</p>
                                                <p className="text-sm text-gray-500">
                                                    {parsedData.customers.length} customers found
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setFile(null); setParsedData(null); }}
                                            className="text-sm text-red-600 hover:text-red-700"
                                        >
                                            Remove
                                        </button>
                                    </div>

                                    {parsedData.errors.length > 0 && (
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 text-yellow-800 mb-2">
                                                <AlertCircle className="w-5 h-5" />
                                                <span className="font-medium">Validation Warnings</span>
                                            </div>
                                            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                                                {parsedData.errors.map((err, idx) => (
                                                    <li key={idx}>{err}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {parsedData.customers.slice(0, 5).map((customer, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{customer.name}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">{customer.type}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500">
                                                            {customer.contactInfo?.phone || customer.contactInfo?.email || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {parsedData.customers.length > 5 && (
                                            <div className="px-4 py-2 bg-gray-50 text-xs text-center text-gray-500 border-t">
                                                And {parsedData.customers.length - 5} more...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 space-y-4">
                            {importResult.failed === 0 ? (
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            ) : (
                                <AlertCircle className="w-16 h-16 text-orange-500 mx-auto" />
                            )}

                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Import Complete</h3>
                                <p className="text-gray-600 mt-2">
                                    Successfully imported <span className="font-bold text-green-600">{importResult.success}</span> customers.
                                    {importResult.failed > 0 && (
                                        <span className="ml-1 text-red-600">Failed to import {importResult.failed}.</span>
                                    )}
                                </p>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="mt-6 text-left bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                                    <p className="font-medium text-red-800 mb-2">Errors:</p>
                                    <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                                        {importResult.errors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg flex justify-end gap-3">
                    {!importResult ? (
                        <>
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!parsedData || parsedData.customers.length === 0 || isImporting}
                                className={`px-4 py-2 rounded-lg text-white flex items-center gap-2 ${!parsedData || parsedData.customers.length === 0 || isImporting
                                        ? 'bg-indigo-400 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import {parsedData ? `${parsedData.customers.length} Customers` : ''}
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
