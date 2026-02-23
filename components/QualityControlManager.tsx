import React, { useState, useEffect, useMemo } from 'react';
import { Microscope, CheckCircle2, XCircle, Clock, Search, Beaker, FileText, ChevronRight } from 'lucide-react';
import { QualityTest, QualityTestStatus, CommodityBatch, BatchStatus, CommodityType } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { QualityTestForm } from './QualityTestForm';

interface QualityControlManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const QualityControlManager: React.FC<QualityControlManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [tests, setTests] = useState<QualityTest[]>([]);
    const [batches, setBatches] = useState<CommodityBatch[]>([]);
    const [commodityTypes, setCommodityTypes] = useState<CommodityType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [editingTest, setEditingTest] = useState<QualityTest | undefined>(undefined);
    const [selectedBatch, setSelectedBatch] = useState<CommodityBatch | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | QualityTestStatus>('all');
    const [activeTab, setActiveTab] = useState<'tests' | 'pending_batches'>('tests');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Simulate multiple calls to get all tests, un-tested batches, etc
            const [testsRes, commoditiesRes] = await Promise.all([
                api.qualityControl.getTests(),
                api.commodityMaster.getCommodityTypes()
            ]);

            if (testsRes.success && testsRes.data) setTests(testsRes.data);
            if (commoditiesRes.success && commoditiesRes.data) setCommodityTypes(commoditiesRes.data);

            // Let's pretend inventory returned our batches
            // Since inventory service doesn't have `getBatches` natively without modifying it, 
            // we'll fetch them manually or mock it if needed.
        } catch (error) {
            console.error('Failed to load quality control data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // Helper for Batches (Mock Data Since It's Missing From Given Scope API)
    // --------------------------------------------------------------------------
    const mockBatches: CommodityBatch[] = [
        {
            id: 'b1',
            companyId: 'company1',
            batchNumber: 'BATCH-2023-001',
            commodityTypeId: commodityTypes[0]?.id || '1',
            supplierId: 'sup1',
            locationId: 'loc1',
            receivedDate: new Date().toISOString(),
            receivedWeight: 100,
            currentWeight: 100,
            status: BatchStatus.RECEIVED,
            costPerTon: 500,
            totalCost: 50000,
            currency: 'USD',
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    const effectiveBatches = batches.length > 0 ? batches : mockBatches;

    const getCommodityName = (typeId: string) => {
        return commodityTypes.find(c => c.id === typeId)?.name || 'Unknown';
    };

    // --------------------------------------------------------------------------
    // Filtering
    // --------------------------------------------------------------------------
    const filteredTests = useMemo(() => {
        return tests.filter(test => {
            const matchesSearch = test.testNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || test.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [tests, searchTerm, statusFilter]);

    const pendingBatches = useMemo(() => {
        return effectiveBatches.filter(b => b.status === BatchStatus.RECEIVED);
    }, [effectiveBatches]);

    // --------------------------------------------------------------------------
    // Interactions
    // --------------------------------------------------------------------------
    const handleInitiateTest = (batch: CommodityBatch) => {
        setSelectedBatch(batch);
        setEditingTest(undefined);
        setShowForm(true);
    };

    const handleEditTest = (test: QualityTest) => {
        const batch = effectiveBatches.find(b => b.id === test.batchId) || mockBatches[0];
        setSelectedBatch(batch);
        setEditingTest(test);
        setShowForm(true);
    };

    const handleSaveTest = async (testData: Partial<QualityTest>) => {
        setIsSubmitting(true);
        try {
            if (editingTest) {
                // Technically an update isn't implemented in the qualityControlService besides status.
                // We'll mock the UI update.
                alert('Updating test parameters is mocked for this demo.');
                setTests(prev => prev.map(t => t.id === editingTest.id ? { ...t, ...testData } as QualityTest : t));
            } else {
                const res = await api.qualityControl.createTest(testData as Omit<QualityTest, 'id' | 'createdAt' | 'status' | 'gradeCalculated'>);
                if (res.success && res.data) {
                    setTests([res.data, ...tests]);
                    if (onAuditLog) onAuditLog('QUALITY_TEST_CREATED', `Created test ${res.data.testNumber} for batch ${selectedBatch?.batchNumber}`);
                } else {
                    alert(res.error || 'Failed to save test');
                }
            }
            setShowForm(false);
            setSelectedBatch(null);
        } catch (error) {
            console.error(error);
            alert('Error saving test data');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (testId: string, batchId: string, status: QualityTestStatus) => {
        if (!window.confirm(`Are you sure you want to mark this test as ${status}?`)) return;

        setIsSubmitting(true);
        try {
            const res = await api.qualityControl.updateTestStatus(testId, status, 'admin', batchId);
            if (res.success && res.data) {
                setTests(prev => prev.map(t => t.id === testId ? res.data! : t));

                if (onAuditLog) onAuditLog('QUALITY_TEST_REVIEW', `Marked test ${res.data.testNumber} as ${status}`);
            } else {
                alert(res.error || 'Failed to update test status');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating status');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --------------------------------------------------------------------------
    // UI Helpers
    // --------------------------------------------------------------------------
    const getStatusBadge = (status: QualityTestStatus) => {
        switch (status) {
            case QualityTestStatus.APPROVED:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
            case QualityTestStatus.REJECTED:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
            case QualityTestStatus.PENDING:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
        }
    };

    const getGradeBadge = (grade?: string) => {
        if (!grade) return <span className="text-slate-400 italic">Not graded</span>;

        let color = 'bg-slate-100 text-slate-800';
        if (grade === 'A') color = 'bg-emerald-100 text-emerald-800';
        if (grade === 'B') color = 'bg-blue-100 text-blue-800';
        if (grade === 'C') color = 'bg-amber-100 text-amber-800';

        return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${color}`}>Grade {grade}</span>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Microscope className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Quality Control</h1>
                        <p className="text-slate-600">Manage lab tests, grading, and batch approvals</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('tests')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tests'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    Quality Tests
                </button>
                <button
                    onClick={() => setActiveTab('pending_batches')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pending_batches'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                >
                    Pending Batches ({pendingBatches.length})
                </button>
            </div>

            {activeTab === 'tests' && (
                <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value={QualityTestStatus.PENDING}>Pending</option>
                            <option value={QualityTestStatus.APPROVED}>Approved</option>
                            <option value={QualityTestStatus.REJECTED}>Rejected</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Test Info</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Key Parameters</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredTests.map((test) => (
                                        <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{test.testNumber}</div>
                                                <div className="text-xs text-slate-500 mt-1">Date: {new Date(test.testDate).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-500">Batch ID: {test.batchId.substring(0, 8)}...</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    {test.moisturePercentage !== undefined && (
                                                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">Moisture: {test.moisturePercentage}%</span>
                                                    )}
                                                    {test.impurityPercentage !== undefined && (
                                                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">Impurity: {test.impurityPercentage}%</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getGradeBadge(test.gradeCalculated)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(test.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {test.status === QualityTestStatus.PENDING ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStatusChange(test.id, test.batchId, QualityTestStatus.APPROVED)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(test.id, test.batchId, QualityTestStatus.REJECTED)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">Reviewed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                <Microscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                <p>No quality tests found.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'pending_batches' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingBatches.map(batch => (
                        <div key={batch.id} className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden hover:shadow-md transition-all">
                            <div className="p-5 border-b border-slate-100 bg-amber-50/50">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">RECEIVED BATCH</span>
                                    <Beaker className="w-5 h-5 text-amber-500" />
                                </div>
                                <h3 className="font-bold text-slate-800">{batch.batchNumber}</h3>
                                <p className="text-sm text-slate-600 mt-1">{getCommodityName(batch.commodityTypeId)}</p>
                            </div>
                            <div className="p-5">
                                <div className="flex justify-between text-sm mb-2 text-slate-600">
                                    <span>Weight:</span>
                                    <span className="font-medium text-slate-900">{batch.currentWeight} MT</span>
                                </div>
                                <div className="flex justify-between text-sm mb-4 text-slate-600">
                                    <span>Received:</span>
                                    <span className="font-medium text-slate-900">{new Date(batch.receivedDate).toLocaleDateString()}</span>
                                </div>
                                <button
                                    onClick={() => handleInitiateTest(batch)}
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    Perform Lab Test
                                </button>
                            </div>
                        </div>
                    ))}
                    {pendingBatches.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 border border-dashed rounded-xl border-slate-300">
                            <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                            <p>All batches have been tested!</p>
                        </div>
                    )}
                </div>
            )}

            {showForm && selectedBatch && (
                <QualityTestForm
                    test={editingTest}
                    batch={selectedBatch}
                    onSave={handleSaveTest}
                    onCancel={() => setShowForm(false)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
