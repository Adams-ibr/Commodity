import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
    ExportCompliance,
    ComplianceStatus,
    Shipment,
    AuditLogEntry
} from '../types_commodity';
import {
    ShieldCheck,
    Search,
    CheckCircle,
    AlertTriangle,
    FileText,
    CreditCard,
    Building2,
    Calendar,
    X,
    ExternalLink,
    ChevronRight,
    Calculator,
    Info
} from 'lucide-react';

interface ComplianceManagerProps {
    onAuditLog: (action: string, details: string) => void;
}

export const ComplianceManager: React.FC<ComplianceManagerProps> = ({ onAuditLog }) => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [complianceRecords, setComplianceRecords] = useState<Record<string, ExportCompliance>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<ExportCompliance>>({
        nepcRegistration: '',
        nxpFormNumber: '',
        phytosanitaryCertificate: '',
        certificateOfOrigin: '',
        exportPermit: '',
        nessFeePaid: false,
        nessAmount: 0,
        cciNumber: '',
        complianceStatus: ComplianceStatus.PENDING
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        const [shipmentRes, complianceRes] = await Promise.all([
            api.sales.getShipments(),
            api.compliance.getAllComplianceRecords()
        ]);

        if (shipmentRes.success && shipmentRes.data) {
            setShipments(shipmentRes.data);
        }

        if (complianceRes.success && complianceRes.data) {
            const records: Record<string, ExportCompliance> = {};
            complianceRes.data.forEach(r => {
                records[r.shipmentId] = r;
            });
            setComplianceRecords(records);
        }

        setIsLoading(false);
    };

    const handleOpenForm = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        const existing = complianceRecords[shipment.id];

        if (existing) {
            setFormData({
                nepcRegistration: existing.nepcRegistration || '',
                nxpFormNumber: existing.nxpFormNumber || '',
                phytosanitaryCertificate: existing.phytosanitaryCertificate || '',
                certificateOfOrigin: existing.certificateOfOrigin || '',
                exportPermit: existing.exportPermit || '',
                nessFeePaid: existing.nessFeePaid,
                nessAmount: existing.nessAmount || api.compliance.calculateNESS(shipment.totalValue),
                cciNumber: existing.cciNumber || '',
                complianceStatus: existing.complianceStatus
            });
        } else {
            setFormData({
                nepcRegistration: '',
                nxpFormNumber: '',
                phytosanitaryCertificate: '',
                certificateOfOrigin: '',
                exportPermit: '',
                nessFeePaid: false,
                nessAmount: api.compliance.calculateNESS(shipment.totalValue),
                cciNumber: '',
                complianceStatus: ComplianceStatus.PENDING
            });
        }
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedShipment) return;

        const res = await api.compliance.updateCompliance(selectedShipment.id, formData);

        if (res.success && res.data) {
            setComplianceRecords(prev => ({
                ...prev,
                [selectedShipment.id]: res.data!
            }));
            onAuditLog('COMPLIANCE_UPDATE', `Updated compliance for shipment ${selectedShipment.shipmentNumber}`);
            setIsFormOpen(false);
            setSelectedShipment(null);
        } else {
            alert('Failed to save compliance data: ' + res.error);
        }
    };

    const filteredShipments = shipments.filter(s =>
        s.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (complianceRecords[s.id]?.nxpFormNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusColor = (status: ComplianceStatus) => {
        switch (status) {
            case ComplianceStatus.COMPLIANT: return 'bg-green-100 text-green-800 border-green-200';
            case ComplianceStatus.NON_COMPLIANT: return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-amber-100 text-amber-800 border-amber-200';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Nigerian Export Compliance</h2>
                    <p className="text-slate-500">Manage NXP, NESS fees, and mandatory export certificates</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Shipments</p>
                            <p className="text-2xl font-bold text-slate-800">{shipments.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Compliant</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {Object.values(complianceRecords as Record<string, ExportCompliance>).filter(r => r.complianceStatus === ComplianceStatus.COMPLIANT).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 rounded-lg">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Pending Docs</p>
                            <p className="text-2xl font-bold text-slate-800">
                                {shipments.length - Object.values(complianceRecords as Record<string, ExportCompliance>).filter(r => r.complianceStatus === ComplianceStatus.COMPLIANT).length}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <CreditCard className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">NESS Fees Accrued</p>
                            <p className="text-2xl font-bold text-slate-800">
                                ${Object.values(complianceRecords as Record<string, ExportCompliance>).reduce((acc, curr) => acc + (curr.nessAmount || 0), 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Shipment # or NXP..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">Shipment #</th>
                                <th className="px-6 py-4">Value (FOB)</th>
                                <th className="px-6 py-4">NESS Fee</th>
                                <th className="px-6 py-4">NXP Form</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">NESS Paid</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredShipments.map(shipment => {
                                const compliance = complianceRecords[shipment.id];
                                return (
                                    <tr key={shipment.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-800">{shipment.shipmentNumber}</div>
                                            <div className="text-xs text-slate-500">{shipment.vesselName || 'No vessel assigned'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-800">
                                                {shipment.currency} {shipment.totalValue.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-800">
                                            ${compliance?.nessAmount.toLocaleString() || api.compliance.calculateNESS(shipment.totalValue).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {compliance?.nxpFormNumber ? (
                                                <div className="flex items-center gap-1 text-sm text-indigo-600 font-mono">
                                                    <FileText className="w-3 h-3" />
                                                    {compliance.nxpFormNumber}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">Not Filed</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(compliance?.complianceStatus || ComplianceStatus.PENDING)}`}>
                                                {compliance?.complianceStatus || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {compliance?.nessFeePaid ? (
                                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                    <CheckCircle className="w-3 h-3" /> Paid
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                    <AlertTriangle className="w-3 h-3" /> Unpaid
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleOpenForm(shipment)}
                                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1 ml-auto"
                                            >
                                                Manage <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Compliance Form Modal */}
            {isFormOpen && selectedShipment && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Compliance Details</h3>
                                    <p className="text-sm text-slate-500">Shipment: {selectedShipment.shipmentNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Statutory Numbers */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" /> Statutory Filings
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">NXP Form Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            value={formData.nxpFormNumber}
                                            onChange={e => setFormData({ ...formData, nxpFormNumber: e.target.value })}
                                            placeholder="e.g. NXP/2026/001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">NEPC Registration</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            value={formData.nepcRegistration}
                                            onChange={e => setFormData({ ...formData, nepcRegistration: e.target.value })}
                                            placeholder="Exporters Reg #"
                                        />
                                    </div>
                                </div>

                                {/* Certificates */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-800 border-b pb-2 flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-slate-400" /> Certificates & Permits
                                    </h4>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Phytosanitary Cert #</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            value={formData.phytosanitaryCertificate}
                                            onChange={e => setFormData({ ...formData, phytosanitaryCertificate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Certificate of Origin</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            value={formData.certificateOfOrigin}
                                            onChange={e => setFormData({ ...formData, certificateOfOrigin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">CCI Number (Clean Cert of Inspection)</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                            value={formData.cciNumber}
                                            onChange={e => setFormData({ ...formData, cciNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* NESS & Financials */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <Calculator className="w-4 h-4 text-indigo-600" />
                                    NESS Fee Management (0.5% Levated)
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Calculated NESS Amount ($)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                                value={formData.nessAmount}
                                                onChange={e => setFormData({ ...formData, nessAmount: Number(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end pb-1">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                checked={formData.nessFeePaid}
                                                onChange={e => setFormData({ ...formData, nessFeePaid: e.target.checked })}
                                            />
                                            <span className="text-sm font-medium text-slate-700">NESS Levy Paid confirmed</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Status Section */}
                            <div className="pt-4 border-t border-slate-200">
                                <label className="block text-sm font-medium text-slate-700 mb-2">Overall Compliance Status</label>
                                <div className="flex gap-4">
                                    {[ComplianceStatus.PENDING, ComplianceStatus.COMPLIANT, ComplianceStatus.NON_COMPLIANT].map(status => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, complianceStatus: status })}
                                            className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 font-semibold ${formData.complianceStatus === status
                                                ? getStatusColor(status).replace('bg-', 'bg-').replace('text-', 'text-') + ' ring-2 ring-offset-1'
                                                : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {status === ComplianceStatus.COMPLIANT && <CheckCircle className="w-4 h-4" />}
                                            {status === ComplianceStatus.PENDING && <Calendar className="w-4 h-4" />}
                                            {status === ComplianceStatus.NON_COMPLIANT && <AlertTriangle className="w-4 h-4" />}
                                            {status}
                                        </button>
                                    ))}
                                </div>
                                {formData.complianceStatus === ComplianceStatus.COMPLIANT && (
                                    <div className="mt-3 flex items-start gap-2 text-xs text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>Setting to COMPLIANT indicates all mandatory Nigerian export documents (NXP, NESS, CCI, Phyto) have been verified.</span>
                                    </div>
                                )}
                            </div>
                        </form>

                        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsFormOpen(false)}
                                className="px-6 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={handleSave}
                                className="px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                            >
                                Save Compliance Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
