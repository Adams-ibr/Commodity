import React, { useState, useEffect } from 'react';
import { QualityTest, CommodityBatch, QualityTestStatus } from '../types_commodity';
import { X, Save, AlertCircle } from 'lucide-react';

interface QualityTestFormProps {
    test?: QualityTest;
    batch: CommodityBatch;
    onSave: (testData: Partial<QualityTest>) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const QualityTestForm: React.FC<QualityTestFormProps> = ({
    test,
    batch,
    onSave,
    onCancel,
    isLoading = false
}) => {
    const [formData, setFormData] = useState({
        testNumber: test?.testNumber || '',
        testDate: test?.testDate || new Date().toISOString().split('T')[0],
        moisturePercentage: test?.moisturePercentage || '',
        impurityPercentage: test?.impurityPercentage || '',
        aflatoxinLevel: test?.aflatoxinLevel || '',
        proteinContent: test?.proteinContent || '',
        oilContent: test?.oilContent || '',
        otherParameters: test?.otherParameters ? JSON.stringify(test.otherParameters) : '',
        labCertificateUrl: test?.labCertificateUrl || ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Generate test number if new
    useEffect(() => {
        if (!test) {
            const timestamp = Date.now().toString().slice(-6);
            setFormData(prev => ({
                ...prev,
                testNumber: `QT-${batch.batchNumber}-${timestamp}`
            }));
        }
    }, [test, batch]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.testNumber.trim()) newErrors.testNumber = 'Test number is required';
        if (!formData.testDate) newErrors.testDate = 'Test date is required';

        // Ensure vital parameters are recorded based on commodity type, but we'll enforce basics here
        if (formData.moisturePercentage !== '' && (Number(formData.moisturePercentage) < 0 || Number(formData.moisturePercentage) > 100)) {
            newErrors.moisturePercentage = 'Invalid percentage';
        }

        if (formData.otherParameters) {
            try {
                JSON.parse(formData.otherParameters);
            } catch (e) {
                newErrors.otherParameters = 'Must be valid JSON';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        let parsedOtherParams = undefined;
        if (formData.otherParameters) {
            parsedOtherParams = JSON.parse(formData.otherParameters);
        }

        const testData: Partial<QualityTest> = {
            ...(test && { id: test.id }),
            batchId: batch.id,
            testNumber: formData.testNumber,
            testDate: formData.testDate,
            moisturePercentage: formData.moisturePercentage ? Number(formData.moisturePercentage) : undefined,
            impurityPercentage: formData.impurityPercentage ? Number(formData.impurityPercentage) : undefined,
            aflatoxinLevel: formData.aflatoxinLevel ? Number(formData.aflatoxinLevel) : undefined,
            proteinContent: formData.proteinContent ? Number(formData.proteinContent) : undefined,
            oilContent: formData.oilContent ? Number(formData.oilContent) : undefined,
            otherParameters: parsedOtherParams,
            labCertificateUrl: formData.labCertificateUrl,
            testedBy: test?.testedBy || 'admin' // In a real app, this comes from auth
        };

        onSave(testData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {test ? 'Edit Quality Test' : 'New Quality Test'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Batch: {batch.batchNumber}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Test Number *
                            </label>
                            <input
                                type="text"
                                value={formData.testNumber}
                                onChange={(e) => setFormData({ ...formData, testNumber: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50 ${errors.testNumber ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                readOnly
                            />
                            {errors.testNumber && <p className="text-red-500 text-xs mt-1">{errors.testNumber}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Test Date *
                            </label>
                            <input
                                type="date"
                                value={formData.testDate}
                                onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${errors.testDate ? 'border-red-500' : 'border-slate-300'
                                    }`}
                                required
                            />
                            {errors.testDate && <p className="text-red-500 text-xs mt-1">{errors.testDate}</p>}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-emerald-600" />
                            Quality Parameters
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Moisture (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.moisturePercentage}
                                    onChange={(e) => setFormData({ ...formData, moisturePercentage: e.target.value })}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${errors.moisturePercentage ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                    placeholder="e.g., 7.5"
                                />
                                {errors.moisturePercentage && <p className="text-red-500 text-xs mt-1">{errors.moisturePercentage}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Impurity (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.impurityPercentage}
                                    onChange={(e) => setFormData({ ...formData, impurityPercentage: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., 1.2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Aflatoxin (ppb)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.aflatoxinLevel}
                                    onChange={(e) => setFormData({ ...formData, aflatoxinLevel: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., 4.0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Protein (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.proteinContent}
                                    onChange={(e) => setFormData({ ...formData, proteinContent: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., 15.5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Oil Content (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.oilContent}
                                    onChange={(e) => setFormData({ ...formData, oilContent: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                                    placeholder="e.g., 48.0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Other Parameters (JSON)
                        </label>
                        <textarea
                            value={formData.otherParameters}
                            onChange={(e) => setFormData({ ...formData, otherParameters: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm ${errors.otherParameters ? 'border-red-500' : 'border-slate-300'
                                }`}
                            rows={3}
                            placeholder='{"freeFattyAcids": 1.5, "peroxideValue": 2.0}'
                        />
                        {errors.otherParameters && <p className="text-red-500 text-xs mt-1">{errors.otherParameters}</p>}
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Lab Certificate URL
                        </label>
                        <input
                            type="url"
                            value={formData.labCertificateUrl}
                            onChange={(e) => setFormData({ ...formData, labCertificateUrl: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            placeholder="https://example.com/certificate.pdf"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                            disabled={isLoading}
                        >
                            {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            <Save className="w-4 h-4" />
                            {test ? 'Update Test' : 'Save Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
