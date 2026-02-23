import React, { useState, useEffect, useMemo } from 'react';
import { Settings, PlayCircle, CheckCircle2, PauseCircle, Search, FileCog, Factory, ArrowRight } from 'lucide-react';
import { ProcessingOrder, ProcessingStatus, ProcessingType, CommodityBatch, BatchStatus } from '../types_commodity';
import { UserRole } from '../types_commodity';
import { api } from '../services/api';
import { ProcessingOrderForm } from './ProcessingOrderForm';

interface ProcessingManagerProps {
    userRole: UserRole;
    onAuditLog?: (action: string, details: string) => void;
}

export const ProcessingManager: React.FC<ProcessingManagerProps> = ({
    userRole,
    onAuditLog
}) => {
    const [orders, setOrders] = useState<ProcessingOrder[]>([]);
    const [batches, setBatches] = useState<CommodityBatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ProcessingOrder | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ProcessingStatus>('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const ordersRes = await api.processing.getOrders();

            if (ordersRes.success && ordersRes.data) setOrders(ordersRes.data);
        } catch (error) {
            console.error('Failed to load processing data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // --------------------------------------------------------------------------
    // Mock Data for Batches 
    // --------------------------------------------------------------------------
    const mockBatches: CommodityBatch[] = [
        {
            id: 'b1_approved',
            companyId: 'company1',
            batchNumber: 'BATCH-2023-002',
            commodityTypeId: '1',
            supplierId: 'sup1',
            locationId: 'loc1',
            receivedDate: new Date().toISOString(),
            receivedWeight: 200,
            currentWeight: 150,
            status: BatchStatus.APPROVED, // Must be approved to process
            grade: 'A',
            costPerTon: 500,
            totalCost: 100000,
            currency: 'USD',
            createdBy: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
    ];

    const availableBatches = (batches.length > 0 ? batches : mockBatches).filter(b => b.status === BatchStatus.APPROVED && b.currentWeight > 0);

    // --------------------------------------------------------------------------
    // Filtering
    // --------------------------------------------------------------------------
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    // --------------------------------------------------------------------------
    // Interactions
    // --------------------------------------------------------------------------
    const handleCreateOrder = () => {
        setEditingOrder(undefined);
        setShowForm(true);
    };

    const handleEditOrder = (order: ProcessingOrder) => {
        setEditingOrder(order);
        setShowForm(true);
    };

    const handleSaveOrder = async (orderData: Partial<ProcessingOrder> & { _inputBatchId?: string, _inputQuantity?: number }) => {
        setIsSubmitting(true);
        try {
            const { _inputBatchId, _inputQuantity, ...cleanOrderData } = orderData;

            if (editingOrder) {
                // Technically update isn't implemented for full data in primitive service 
                alert('Order structure updating mocked for demo.');
                setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...cleanOrderData } as ProcessingOrder : o));
            } else {
                const res = await api.processing.createOrder(cleanOrderData as Omit<ProcessingOrder, 'id' | 'createdAt' | 'status'>);
                if (res.success && res.data) {
                    setOrders([res.data, ...orders]);
                    if (onAuditLog) onAuditLog('PROCESSING_ORDER_CREATED', `Created processing order ${res.data.orderNumber} consuming ${_inputQuantity} MT`);

                    alert(`Success! Created order ${res.data.orderNumber}. In a full implementation, this isolates ${_inputQuantity} MT from the input batch.`);
                } else {
                    alert(res.error || 'Failed to save order');
                }
            }
            setShowForm(false);
        } catch (error) {
            console.error(error);
            alert('Error saving order data');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChange = async (orderId: string, status: ProcessingStatus) => {
        setIsSubmitting(true);
        try {
            const res = await api.processing.updateOrderStatus(orderId, status);
            if (res.success && res.data) {
                setOrders(prev => prev.map(o => o.id === orderId ? res.data! : o));
                if (onAuditLog) onAuditLog('PROCESSING_STATUS_UPDATE', `Updated processing order status to ${status}`);

                if (status === ProcessingStatus.COMPLETED) {
                    alert('Order completed! An output batch would be generated reflecting yield and grading.');
                }
            } else {
                alert(res.error || 'Failed to update order status');
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
    const getStatusBadge = (status: ProcessingStatus) => {
        switch (status) {
            case ProcessingStatus.PLANNED:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800"><Settings className="w-3 h-3 mr-1" /> Planned</span>;
            case ProcessingStatus.IN_PROGRESS:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><PlayCircle className="w-3 h-3 mr-1" /> In Progress</span>;
            case ProcessingStatus.COMPLETED:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</span>;
            case ProcessingStatus.CANCELLED:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><PauseCircle className="w-3 h-3 mr-1" /> Cancelled</span>;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Factory className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Processing & Production</h1>
                        <p className="text-slate-600">Manage commodity transformation and manufacturing orders</p>
                    </div>
                </div>
                <button
                    onClick={handleCreateOrder}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <FileCog className="w-4 h-4" />
                    New Processing Order
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
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
                    {Object.values(ProcessingStatus).map(status => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Order Details</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Type & Dates</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                    <td className="px-6 py-4" onClick={() => handleEditOrder(order)}>
                                        <div className="font-bold text-indigo-700 hover:text-indigo-800">{order.orderNumber}</div>
                                        <div className="text-xs text-slate-500 mt-1">ID: {order.id.slice(0, 8)}...</div>
                                    </td>
                                    <td className="px-6 py-4" onClick={() => handleEditOrder(order)}>
                                        <span className="inline-block px-2 py-1 bg-slate-100 text-xs font-medium rounded border border-slate-200 mb-1">
                                            {order.processingType}
                                        </span>
                                        <div className="text-xs text-slate-600">Ordered: {new Date(order.orderDate).toLocaleDateString()}</div>
                                        {order.processingDate && <div className="text-xs text-slate-500">Planned: {new Date(order.processingDate).toLocaleDateString()}</div>}
                                    </td>
                                    <td className="px-6 py-4" onClick={() => handleEditOrder(order)}>
                                        {getStatusBadge(order.status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.status === ProcessingStatus.PLANNED && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, ProcessingStatus.IN_PROGRESS); }}
                                                    className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 border border-blue-200"
                                                >
                                                    Start Processing
                                                </button>
                                            )}
                                            {order.status === ProcessingStatus.IN_PROGRESS && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, ProcessingStatus.COMPLETED); }}
                                                    className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded hover:bg-emerald-100 border border-emerald-200"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <Factory className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p>No processing orders found.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <ProcessingOrderForm
                    order={editingOrder}
                    availableBatches={availableBatches}
                    onSave={handleSaveOrder}
                    onCancel={() => setShowForm(false)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
