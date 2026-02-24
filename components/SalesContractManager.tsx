import React, { useState, useEffect, useMemo } from 'react';
import { SalesContract, ContractStatus, Buyer, CommodityType, DocumentType } from '../types_commodity';
import { FileText, Plus, Search, MapPin, Calendar, Receipt, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { SalesContractForm } from './SalesContractForm';

const ITEMS_PER_PAGE = 25;

interface SalesContractManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const SalesContractManager: React.FC<SalesContractManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [contracts, setContracts] = useState<SalesContract[]>([]);
    const [buyers, setBuyers] = useState<Buyer[]>([]);
    const [commodityTypes, setCommodityTypes] = useState<CommodityType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [selectedContract, setSelectedContract] = useState<SalesContract | undefined>();
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    useEffect(() => {
        loadData();
    }, [page]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [contractsRes, buyersRes, latestCommTypes] = await Promise.all([
                api.sales.getSalesContracts({ page, limit: ITEMS_PER_PAGE }),
                api.sales.getBuyers(),
                api.commodityMaster.getCommodityTypes()
            ]);

            if (contractsRes.success && contractsRes.data) {
                setContracts(contractsRes.data.data);
                setTotalRecords(contractsRes.data.total);
            }
            if (buyersRes.success && buyersRes.data) setBuyers(buyersRes.data);
            setCommodityTypes(latestCommTypes || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalPages = Math.max(1, Math.ceil(totalRecords / ITEMS_PER_PAGE));

    const handleSaveContract = async (contractData: any) => {
        setIsLoading(true);
        try {
            let res;
            if (contractData.id) {
                // For now we re-create as update is not fully mapped in service
                res = await api.sales.createSalesContract({
                    ...contractData,
                    contractNumber: contractData.id ? contracts.find(c => c.id === contractData.id)?.contractNumber || `SC-${Date.now().toString().slice(-6)}` : `SC-${Date.now().toString().slice(-6)}`,
                    createdBy: 'system'
                });
            } else {
                res = await api.sales.createSalesContract({
                    ...contractData,
                    contractNumber: `SC-${Date.now().toString().slice(-6)}`,
                    createdBy: 'system'
                });
            }

            if (res.success) {
                if (onAuditLog) onAuditLog('SALES_CONTRACT_SAVE', `Saved contract ${res.data?.contractNumber}`);
                setShowForm(false);
                loadData();
            } else {
                alert(res.error || 'Failed to save contract');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getBuyerName = (id: string) => buyers.find(b => b.id === id)?.name || 'Unknown Buyer';
    const getCommodityName = (id: string) => commodityTypes.find(c => c.id === id)?.name || 'Unknown Commodity';

    const filteredContracts = useMemo(() => {
        return contracts.filter(c =>
            c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getBuyerName(c.buyerId).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contracts, searchTerm, buyers]);

    const handleStatusChange = async (id: string, newStatus: ContractStatus) => {
        try {
            const res = await api.sales.updateContractStatus(id, newStatus);
            if (res.success) {
                setContracts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
                if (onAuditLog) onAuditLog('SALES_CONTRACT_UDPATE', `Updated contract ${id} to ${newStatus}`);
            } else {
                alert(res.error || 'Failed to update contract');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerateInvoice = async (contract: SalesContract) => {
        const buyer = buyers.find(b => b.id === contract.buyerId);
        if (!buyer) return;

        setIsGenerating(contract.id);
        try {
            const pdf = await api.documents.generateInvoicePDF(contract, buyer);
            const fileName = `Invoice_${contract.contractNumber}.pdf`;

            // Save to DB
            await api.documents.recordDocument({
                companyId: contract.companyId,
                referenceType: 'SALES_CONTRACT',
                referenceId: contract.id,
                documentType: DocumentType.INVOICE,
                fileName,
                filePath: `invoices/${fileName}`, // Simulated path
                fileSize: pdf.output().length,
                mimeType: 'application/pdf',
                version: 1,
                uploadedBy: 'system'
            });

            pdf.save(fileName);

            if (onAuditLog) {
                onAuditLog('GENERATE_INVOICE', `Generated invoice for contract ${contract.contractNumber}`);
            }
        } catch (error) {
            console.error('Failed to generate invoice:', error);
            alert('Error generating invoice');
        } finally {
            setIsGenerating(null);
        }
    };

    if (isLoading && contracts.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Sales Contracts</h2>
                    <p className="text-slate-600 font-medium">Draft and track fulfillment of B2B outbound deals</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedContract(undefined);
                        setShowForm(true);
                    }}
                    className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>New Sales Contract</span>
                </button>
            </div>

            {showForm && (
                <SalesContractForm
                    contract={selectedContract}
                    buyers={buyers}
                    commodityTypes={commodityTypes}
                    onSave={handleSaveContract}
                    onCancel={() => setShowForm(false)}
                    isLoading={isLoading}
                />
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search contracts or buyers..."
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
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Contract & Buyer</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Commodity</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Performance</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Logistics</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredContracts.map(contract => (
                                <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800 flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            {contract.contractNumber}
                                        </div>
                                        <div className="text-sm text-slate-600 mt-1">{getBuyerName(contract.buyerId)}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-700">{getCommodityName(contract.commodityTypeId)}</div>
                                        <div className="text-xs text-slate-500 mt-1 uppercase tracking-tighter">@ {contract.currency} {contract.pricePerTon.toLocaleString()}/MT</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-slate-700">
                                            {contract.shippedQuantity} / {contract.contractedQuantity} MT
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (contract.shippedQuantity / contract.contractedQuantity) * 100)}%` }}></div>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 font-mono uppercase">Val: {contract.currency} {contract.totalValue.toLocaleString()}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {contract.incoterms && (
                                            <div className="text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mb-1 font-semibold text-slate-600">
                                                {contract.incoterms}
                                            </div>
                                        )}
                                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            {contract.destinationPort || 'No Dest'}
                                        </div>
                                        <div className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            {contract.contractDate && new Date(contract.contractDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${contract.status === ContractStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700' :
                                            contract.status === ContractStatus.COMPLETED ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {contract.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {contract.status === ContractStatus.DRAFT && (
                                            <button
                                                onClick={() => handleStatusChange(contract.id, ContractStatus.ACTIVE)}
                                                className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded hover:bg-indigo-100 border border-indigo-200"
                                            >
                                                Activate
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleGenerateInvoice(contract)}
                                            disabled={isGenerating === contract.id}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-block"
                                            title="Generate Invoice"
                                        >
                                            {isGenerating === contract.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Receipt className="w-4 h-4" />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
