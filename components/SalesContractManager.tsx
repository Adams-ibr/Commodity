import React, { useState, useEffect, useMemo } from 'react';
import { SalesContract, ContractStatus, Buyer, CommodityType, DocumentType, UserRole } from '../types_commodity';
import { FileText, Plus, Search, MapPin, Calendar, Receipt, Loader2, ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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

    useEffect(() => { loadData(); }, [page]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [contractsRes, buyersRes, commTypesRes] = await Promise.all([
                api.sales.getSalesContracts({ page, limit: ITEMS_PER_PAGE, includeItems: true }),
                api.sales.getBuyers(),
                api.commodityMaster.getCommodityTypes()
            ]);

            if (contractsRes.success && contractsRes.data) {
                setContracts(contractsRes.data.data || []);
                setTotalRecords(contractsRes.data.total || 0);
            }
            if (buyersRes.success && buyersRes.data) setBuyers(buyersRes.data);
            if (commTypesRes.success && commTypesRes.data) setCommodityTypes(commTypesRes.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveContract = async (contractData: any) => {
        setIsLoading(true);
        try {
            const res = await api.sales.createSalesContract({
                ...contractData,
                contractNumber: contractData.id ? contracts.find(c => c.id === contractData.id)?.contractNumber : `SC-${Date.now().toString().slice(-6)}`,
                createdBy: 'system'
            });

            if (res.success) {
                if (onAuditLog) onAuditLog('SALES_CONTRACT_SAVE', `Saved contract ${res.data?.contractNumber}`);
                setShowForm(false);
                loadData();
            } else {
                alert(res.error || 'Failed to save');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: ContractStatus) => {
        try {
            const res = await api.sales.updateContractStatus(id, newStatus);
            if (res.success) {
                setContracts(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
            } else {
                alert(res.error || 'Update failed');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getBuyerName = (id: string) => buyers.find(b => b.id === id)?.name || 'Unknown';
    const getCommodityName = (id: string) => commodityTypes.find(c => c.id === id)?.name || 'Unknown';

    const handleGenerateInvoice = async (contract: SalesContract) => {
        const buyer = buyers.find(b => b.id === contract.buyerId);
        if (!buyer) return;

        setIsGenerating(contract.id);
        try {
            const pdf = await api.documents.generateInvoicePDF(contract, buyer);
            const fileName = `Invoice_${contract.contractNumber}.pdf`;
            pdf.save(fileName);

            const invoiceItems = contract.items?.map((item: any) => ({
                description: `${getCommodityName(item.commodityTypeId)} - ${item.grade || 'Std Grade'}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                amount: item.quantity * item.unitPrice,
                salesContractItemId: item.id
            })) || [
                    {
                        description: `${getCommodityName(contract.commodityTypeId)} - Sales Contract Fulfillment`,
                        quantity: contract.contractedQuantity,
                        unitPrice: contract.pricePerTon || 0,
                        amount: contract.totalAmount || contract.totalValue || 0
                    }
                ];

            const totalAmount = contract.totalAmount || contract.totalValue || 0;

            await api.invoices.createInvoice({
                companyId: contract.companyId,
                type: 'SALES',
                invoiceNumber: `INV-${contract.contractNumber}-${Date.now().toString().slice(-4)}`,
                buyerId: contract.buyerId,
                buyerName: buyer.name,
                buyerEmail: buyer.email,
                buyerAddress: buyer.address,
                salesContractId: contract.id,
                salesContractNumber: contract.contractNumber,
                invoiceDate: new Date().toISOString().slice(0, 10),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
                items: invoiceItems,
                subtotal: totalAmount,
                taxRate: 0,
                taxAmount: 0,
                discount: 0,
                totalAmount: totalAmount,
                amountPaid: 0,
                balanceDue: totalAmount,
                currency: contract.currency,
                status: 'SENT',
                createdBy: 'system'
            });

            alert(`Invoice generated for ${contract.contractNumber}`);
        } catch (error) {
            console.error(error);
            alert('Error generating invoice');
        } finally {
            setIsGenerating(null);
        }
    };

    const StatusBadge = ({ status }: { status: ContractStatus }) => {
        const styles: Record<string, string> = {
            [ContractStatus.DRAFT]: 'bg-slate-100 text-slate-700 border-slate-200',
            [ContractStatus.SUBMITTED]: 'bg-amber-50 text-amber-700 border-amber-200',
            [ContractStatus.ACTIVE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            [ContractStatus.COMPLETED]: 'bg-blue-50 text-blue-700 border-blue-200',
            [ContractStatus.CANCELLED]: 'bg-rose-50 text-rose-700 border-rose-200',
        };
        const icons: Record<string, any> = {
            [ContractStatus.DRAFT]: Clock,
            [ContractStatus.SUBMITTED]: AlertCircle,
            [ContractStatus.ACTIVE]: CheckCircle,
        };
        const Icon = icons[status] || Clock;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black rounded-full border ${styles[status]}`}>
                <Icon className="w-3 h-3" />
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Sales Contracts</h2>
                    <p className="text-slate-500 font-medium">Manage and authorize outbound commodity trades</p>
                </div>
                <button
                    onClick={() => { setSelectedContract(undefined); setShowForm(true); }}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-bold active:scale-95"
                >
                    <Plus size={20} />
                    <span>Create Agreement</span>
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

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Find contracts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commodities</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lifecycle</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {contracts.filter(c => c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())).map(contract => (
                                <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="font-black text-slate-900 flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-indigo-500" />
                                            {contract.contractNumber}
                                        </div>
                                        <div className="text-xs font-bold text-slate-500">{getBuyerName(contract.buyerId)}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        {contract.items && contract.items.length > 1 ? (
                                            <div>
                                                <div className="text-sm font-black text-slate-800">Mixed Cargo</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase">{contract.items.length} Line Items</div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="text-sm font-black text-slate-800">
                                                    {getCommodityName(contract.items?.[0]?.commodityTypeId || contract.commodityTypeId)}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase italic">
                                                    {contract.items?.[0]?.grade || 'Standard'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                {contract.shippedQuantity} / {contract.contractedQuantity} MT
                                            </span>
                                            <span className="text-[10px] font-black text-indigo-600 italic">
                                                {contract.currency} {(contract.totalAmount || contract.totalValue || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (contract.shippedQuantity / contract.contractedQuantity) * 100)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <StatusBadge status={contract.status} />
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {contract.status === ContractStatus.DRAFT && (
                                                <button onClick={() => handleStatusUpdate(contract.id, ContractStatus.SUBMITTED)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-xs uppercase transition-all">Submit</button>
                                            )}
                                            {contract.status === ContractStatus.SUBMITTED && userRole === 'admin' && (
                                                <button onClick={() => handleStatusUpdate(contract.id, ContractStatus.ACTIVE)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold text-xs uppercase transition-all">Approve</button>
                                            )}
                                            <button onClick={() => handleGenerateInvoice(contract)} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all">
                                                <Receipt className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
