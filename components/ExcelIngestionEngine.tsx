import React, { useState, useRef } from 'react';
import {
    FileSpreadsheet,
    Upload,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    RefreshCcw,
    Table as TableIcon,
    ChevronRight,
    Database,
    Search,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { COLLECTIONS } from '../services/supabaseDb';
import { ingestionService, INGESTION_SCHEMAS, FieldMapping, IngestionResult } from '../services/ingestionService';

interface ExcelIngestionEngineProps {
    onAuditLog?: (action: string, details: string) => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

export const ExcelIngestionEngine: React.FC<ExcelIngestionEngineProps> = ({ onAuditLog }) => {
    const [currentStep, setCurrentStep] = useState<Step>('upload');
    const [selectedTable, setSelectedTable] = useState<string>(COLLECTIONS.COMMODITY_BATCHES);
    const [file, setFile] = useState<File | null>(null);
    const [rawData, setRawData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [transformedData, setTransformedData] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<IngestionResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            await processFile(selectedFile);
        }
    };

    const processFile = async (selectedFile: File) => {
        setIsProcessing(true);
        try {
            setFile(selectedFile);

            // First load necessary reference data for intelligent ID resolution
            await ingestionService.loadReferences(selectedTable);

            const { columns: cols, data: rows } = await ingestionService.parseFile(selectedFile);
            setColumns(cols);
            setRawData(rows);

            const suggested = ingestionService.suggestMapping(cols, selectedTable);
            setMappings(suggested);

            setCurrentStep('mapping');
        } catch (err) {
            console.error('File parsing error:', err);
            alert('Failed to parse file. Please ensure it is a valid Excel or CSV file.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMappingChange = (targetField: string, sourceColumn: string) => {
        setMappings(prev => prev.map(m =>
            m.targetField === targetField ? { ...m, sourceColumn } : m
        ));
    };

    const proceedToPreview = async () => {
        setIsProcessing(true);
        try {
            // Auto-provision missing master data (Categories/Types) if needed
            const provision = await ingestionService.prepareAndProvision(selectedTable, rawData, mappings);
            if (!provision.success) {
                alert(provision.error || 'Failed to provision master data');
                return;
            }

            const transformed = ingestionService.transformData(rawData, mappings, selectedTable);
            setTransformedData(transformed);
            setCurrentStep('preview');
        } catch (err) {
            console.error('Preprocessing error:', err);
            alert('Failed to prepare data for preview.');
        } finally {
            setIsProcessing(false);
        }
    };

    const startIngestion = async () => {
        setIsProcessing(true);
        try {
            const res = await ingestionService.ingest(selectedTable, transformedData);
            setResult(res);
            setCurrentStep('result');
            if (onAuditLog && res.success) {
                onAuditLog('DATA_INGESTION', `Ingested ${res.count} records into ${selectedTable}`);
            }
        } catch (err) {
            console.error('Ingestion error:', err);
            setResult({ success: false, count: 0, errors: [String(err)] });
            setCurrentStep('result');
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setFile(null);
        setRawData([]);
        setColumns([]);
        setMappings([]);
        setTransformedData([]);
        setResult(null);
        setCurrentStep('upload');
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header & Stepper */}
            <div className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Database className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Smart Excel Ingestion</h2>
                            <p className="text-sm text-slate-500">Bulk data import with intelligent field mapping</p>
                        </div>
                    </div>
                    <button
                        onClick={reset}
                        className="flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        <span>Start Over</span>
                    </button>
                </div>

                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    {[
                        { id: 'upload', label: 'Upload' },
                        { id: 'mapping', label: 'Map Fields' },
                        { id: 'preview', label: 'Preview' },
                        { id: 'result', label: 'Result' }
                    ].map((step, idx) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${currentStep === step.id
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                    : (idx < ['upload', 'mapping', 'preview', 'result'].indexOf(currentStep)
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-slate-200 bg-white text-slate-400')
                                    }`}>
                                    {idx < ['upload', 'mapping', 'preview', 'result'].indexOf(currentStep) ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <span className="text-sm font-bold">{idx + 1}</span>
                                    )}
                                </div>
                                <span className={`text-xs mt-2 font-medium ${currentStep === step.id ? 'text-indigo-600' : 'text-slate-400'}`}>
                                    {step.label}
                                </span>
                            </div>
                            {idx < 3 && (
                                <div className={`flex-1 h-0.5 mx-4 ${idx < ['upload', 'mapping', 'preview', 'result'].indexOf(currentStep) ? 'bg-green-500' : 'bg-slate-200'
                                    }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {/* STEP 1: UPLOAD */}
                {currentStep === 'upload' && (
                    <div className="max-w-xl mx-auto space-y-8 py-8 text-center">
                        <div className="space-y-4">
                            <label className="block text-sm font-semibold text-slate-700 text-left">Target ERP Table</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {Object.entries(INGESTION_SCHEMAS).map(([key, schema]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedTable(key)}
                                        className={`p-4 text-left border-2 rounded-xl transition-all ${selectedTable === key
                                            ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${selectedTable === key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            <TableIcon className="w-4 h-4" />
                                        </div>
                                        <span className={`font-semibold block ${selectedTable === key ? 'text-indigo-700' : 'text-slate-700'}`}>
                                            {schema.label}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {schema.fields.length} predefined fields
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx,.xls,.csv"
                                className="hidden"
                            />
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Drop your file here</h3>
                                <p className="text-slate-500 mt-2 max-w-xs">Supports Excel (.xlsx, .xls) and CSV files. Max 10MB.</p>
                                <div className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-colors">
                                    Select File
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 2: MAPPING */}
                {currentStep === 'mapping' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Field Mapping</h3>
                                <p className="text-sm text-slate-500">Map your file columns to the {INGESTION_SCHEMAS[selectedTable].label} table fields</p>
                            </div>
                            <button
                                onClick={proceedToPreview}
                                className="flex items-center space-x-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                            >
                                <span>Review Data</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ERP Field</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                                            <ArrowRight className="w-4 h-4 mx-auto" />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Source Column (Excel)</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {INGESTION_SCHEMAS[selectedTable].fields.map(field => {
                                        const mapping = mappings.find(m => m.targetField === field.name);
                                        const isMapped = mapping && mapping.sourceColumn;

                                        return (
                                            <tr key={field.name} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700">{field.label}</span>
                                                        <span className="text-xs text-slate-400 font-mono">{field.name} {field.required && <span className="text-red-500">*</span>}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ArrowRight className={`w-4 h-4 mx-auto ${isMapped ? 'text-indigo-400' : 'text-slate-300'}`} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select
                                                        value={mapping?.sourceColumn || ''}
                                                        onChange={(e) => handleMappingChange(field.name, e.target.value)}
                                                        className={`w-full bg-white border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 transition-all ${isMapped ? 'border-indigo-200 text-slate-700' : 'border-slate-200 text-slate-400 italic'
                                                            }`}
                                                    >
                                                        <option value="">-- Do not import --</option>
                                                        {columns.map(col => (
                                                            <option key={col} value={col}>{col}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {field.required && !isMapped ? (
                                                        <div className="flex items-center space-x-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-full w-fit">
                                                            <AlertCircle className="w-3 h-3" />
                                                            <span>Required</span>
                                                        </div>
                                                    ) : isMapped ? (
                                                        <div className="flex items-center space-x-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Ready</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Optional</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* STEP 3: PREVIEW */}
                {currentStep === 'preview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Data Preview</h3>
                                <p className="text-sm text-slate-500">Review transformed data before final ingestion ({transformedData.length} records)</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => setCurrentStep('mapping')}
                                    className="px-6 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                                >
                                    Back to Mapping
                                </button>
                                <button
                                    onClick={startIngestion}
                                    disabled={isProcessing}
                                    className="flex items-center space-x-2 px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                                    <span>Ingest {transformedData.length} records</span>
                                </button>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        {INGESTION_SCHEMAS[selectedTable].fields.map(f => (
                                            <th key={f.name} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest min-w-[120px]">
                                                {f.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transformedData.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            {INGESTION_SCHEMAS[selectedTable].fields.map(f => (
                                                <td key={f.name} className="px-4 py-3 text-sm text-slate-600">
                                                    {typeof row[f.name] === 'object' ? JSON.stringify(row[f.name]) : String(row[f.name] || '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transformedData.length > 5 && (
                                <div className="p-4 bg-slate-50 text-center text-sm text-slate-500 italic border-t border-slate-100">
                                    + {transformedData.length - 5} more records (truncated for preview)
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 4: RESULT */}
                {currentStep === 'result' && result && (
                    <div className="max-w-xl mx-auto py-12 text-center animate-in zoom-in duration-500">
                        {result.success ? (
                            <>
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-800">Ingestion Successful!</h2>
                                <p className="text-slate-600 mt-4 text-lg">
                                    Successfully imported <span className="font-bold text-indigo-600">{result.count}</span> records into <span className="font-semibold">{INGESTION_SCHEMAS[selectedTable].label}</span>.
                                </p>
                                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button
                                        onClick={reset}
                                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                    >
                                        Import Another File
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle className="w-10 h-10 text-red-600" />
                                </div>
                                <h2 className="text-3xl font-extrabold text-slate-800">Ingestion Failed</h2>
                                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-left">
                                    <h4 className="font-bold mb-2">Errors encountered:</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                                    </ul>
                                </div>
                                <button
                                    onClick={() => setCurrentStep('preview')}
                                    className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all"
                                >
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
