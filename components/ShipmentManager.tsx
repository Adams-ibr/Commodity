import React, { useState, useEffect, useMemo } from 'react';
import { Shipment, ShipmentStatus, SalesContract, Buyer, DocumentType } from '../types_commodity';
import { Ship, Anchor, Search, Plus, FileText, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';

const ITEMS_PER_PAGE = 25;

interface ShipmentManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const ShipmentManager: React.FC<ShipmentManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [contracts, setContracts] = useState<SalesContract[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    useEffect(() => {
        loadData();
    }, [page]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [shipmentsRes, contractsRes, buyersRes] = await Promise.all([
                api.sales.getShipments({ page, limit: ITEMS_PER_PAGE }),
                api.sales.getSalesContracts({ page: 1, limit: 500 }),
                api.sales.getBuyers()
            ]);

            if (shipmentsRes.success && shipmentsRes.data) {
                setShipments(shipmentsRes.data.data);
                setTotalRecords(shipmentsRes.data.total);
            }
            if (contractsRes.success && contractsRes.data) setContracts(contractsRes.data.data);
            if (buyersRes.success && buyersRes.data) setBuyers(buyersRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));

    const handleGenerateWaybill = async (shipment: Shipment) => {
        const contract = contracts.find(c => c.id === shipment.salesContractId);
        const buyer = buyers.find(b => b.id === shipment.buyerId);
        if (!contract || !buyer) return;

        setIsGenerating(shipment.id);
        try {
            const pdf = await api.documents.generateWaybillPDF(shipment, buyer, contract);
            const fileName = `Waybill_${shipment.shipmentNumber}.pdf`;

            await api.documents.recordDocument({
                companyId: shipment.companyId,
                referenceType: 'SHIPMENT',
                referenceId: shipment.id,
                documentType: DocumentType.BILL_OF_LADING,
                fileName,
                filePath: `waybills/${fileName}`,
                fileSize: pdf.output().length,
                mimeType: 'application/pdf',
                version: 1,
                uploadedBy: 'system'
            });

            pdf.save(fileName);

            if (onAuditLog) {
                onAuditLog('GENERATE_WAYBILL', `Generated waybill for shipment ${shipment.shipmentNumber}`);
            }
        } catch (error) {
            console.error('Failed to generate waybill:', error);
            alert('Error generating waybill');
        } finally {
            setIsGenerating(null);
        }
    };

    const getBuyerName = (id: string) => buyers.find(b => b.id === id)?.name || 'Unknown Buyer';
    const getContractName = (id: string) => contracts.find(c => c.id === id)?.contractNumber || 'Unknown Contract';

    const filteredShipments = useMemo(() => {
        return shipments.filter(s =>
            s.shipmentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.vesselName && s.vesselName.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [shipments, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-900 rounded-lg">
                        <Ship className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Shipments Dashboard</h2>
                        <p className="text-slate-600 font-medium">Coordinate logistics and batch allocations for outbound delivery</p>
                    </div>
                </div>
                <button
                    onClick={() => alert("Mock: Open Create Shipment Modal")}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>New Shipment Schedule</span>
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search vessels or shipment numbers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Dispatch Ref</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Carrier Info</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Route</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Consignment</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredShipments.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-indigo-700">{s.shipmentNumber}</div>
                                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Ref: {getContractName(s.salesContractId)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                            <Anchor className="w-4 h-4 text-slate-400" />
                                            {s.vesselName || 'TBD'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <span className="font-semibold text-slate-600 text-xs">Port of Loading:</span><br />
                                            {s.loadingPort || 'TBD'}
                                        </div>
                                        <div className="text-sm mt-1">
                                            <span className="font-semibold text-slate-600 text-xs">Destination:</span><br />
                                            {s.destinationPort || 'TBD'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-800">{s.totalQuantity} MT</div>
                                        <div className="text-xs text-slate-500 mt-1">Val: {s.currency} {s.totalValue.toLocaleString()}</div>
                                        <div className="text-xs font-bold text-emerald-600 mt-1">{getBuyerName(s.buyerId)}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${s.status === ShipmentStatus.SHIPPED ? 'bg-indigo-100 text-indigo-700' :
                                            s.status === ShipmentStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium pr-2"
                                        >
                                            Allocate Batches
                                        </button>
                                        <button
                                            onClick={() => handleGenerateWaybill(s)}
                                            disabled={isGenerating === s.id}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded transition-colors"
                                            title="Generate Waybill"
                                        >
                                            {isGenerating === s.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <FileText className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredShipments.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Ship className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p>No shipments scheduled yet.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                    <span className="text-sm text-slate-600">
                        Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, totalRecords)}–{Math.min(page * ITEMS_PER_PAGE, totalRecords)} of {totalRecords}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-medium text-slate-700 min-w-[80px] text-center">
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
