import React, { useState, useMemo } from 'react';
import { Search, Eye, Edit, Trash2, Users, Building, AlertTriangle } from 'lucide-react';
import { Supplier, SupplierType } from '../types_commodity';
import { UserRole } from '../types_commodity';

interface SupplierListProps {
    suppliers: Supplier[];
    userRole: UserRole;
    onViewSupplier: (supplier: Supplier) => void;
    onEditSupplier: (supplier: Supplier) => void;
    onDeleteSupplier: (supplierId: string) => void;
    isLoading?: boolean;
}

export const SupplierList: React.FC<SupplierListProps> = ({
    suppliers,
    userRole,
    onViewSupplier,
    onEditSupplier,
    onDeleteSupplier,
    isLoading = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | SupplierType>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
    const [sortField, setSortField] = useState<keyof Supplier>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Filter and search suppliers
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const matchesSearch =
                supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                supplier.phone?.includes(searchTerm) ||
                supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'all' || supplier.type === filterType;
            const isActive = supplier.isActive;
            const matchesStatus = filterStatus === 'all' ||
                (filterStatus === 'Active' && isActive) ||
                (filterStatus === 'Inactive' && !isActive);

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [suppliers, searchTerm, filterType, filterStatus]);

    // Sort suppliers
    const sortedSuppliers = useMemo(() => {
        return [...filteredSuppliers].sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            // Handle boolean for isActive
            if (sortField === 'isActive') {
                const aBool = a.isActive ? 1 : 0;
                const bBool = b.isActive ? 1 : 0;
                return sortDirection === 'asc' ? aBool - bBool : bBool - aBool;
            }

            return 0;
        });
    }, [filteredSuppliers, sortField, sortDirection]);

    // Paginate suppliers
    const paginatedSuppliers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedSuppliers.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedSuppliers, currentPage]);

    const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);

    const handleSort = (field: keyof Supplier) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const canEdit = userRole === UserRole.SUPER_ADMIN ||
        userRole === UserRole.ADMIN ||
        userRole === UserRole.PROCUREMENT_MANAGER;

    const canDelete = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;

    const formatContact = (supplier: Supplier) => {
        const contacts = [];
        if (supplier.phone) contacts.push(supplier.phone);
        if (supplier.email) contacts.push(supplier.email);
        return contacts.join(' • ') || 'No contact info';
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="ml-3 text-slate-600">Loading suppliers...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Building className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-xl font-semibold text-slate-800">Supplier Directory</h2>
                    </div>
                    <div className="text-sm text-slate-500">
                        {sortedSuppliers.length} of {suppliers.length} suppliers
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, contact person, email or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">All Types</option>
                            <option value={SupplierType.FARMER}>Farmers</option>
                            <option value={SupplierType.AGGREGATOR}>Aggregators</option>
                            <option value={SupplierType.COOPERATIVE}>Cooperatives</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Supplier Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center gap-1">
                                    Supplier Details
                                    {sortField === 'name' && (
                                        <span className="text-emerald-600">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                onClick={() => handleSort('type')}
                            >
                                <div className="flex items-center gap-1">
                                    Type
                                    {sortField === 'type' && (
                                        <span className="text-emerald-600">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Contact Info
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                onClick={() => handleSort('isActive')}
                            >
                                <div className="flex items-center gap-1">
                                    Status
                                    {sortField === 'isActive' && (
                                        <span className="text-emerald-600">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                onClick={() => handleSort('performanceRating')}
                            >
                                <div className="flex items-center gap-1">
                                    Rating
                                    {sortField === 'performanceRating' && (
                                        <span className="text-emerald-600">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                                onClick={() => handleSort('totalPurchases')}
                            >
                                <div className="flex items-center gap-1">
                                    Total Volume
                                    {sortField === 'totalPurchases' && (
                                        <span className="text-emerald-600">
                                            {sortDirection === 'asc' ? '↑' : '↓'}
                                        </span>
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {paginatedSuppliers.map((supplier) => (
                            <tr key={supplier.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="font-medium text-slate-900">{supplier.name}</div>
                                    {supplier.registrationNumber && (
                                        <div className="text-xs text-slate-500">Reg: {supplier.registrationNumber}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${supplier.type === SupplierType.FARMER
                                        ? 'bg-amber-100 text-amber-800'
                                        : supplier.type === SupplierType.AGGREGATOR
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {supplier.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-slate-900">{supplier.contactPerson}</div>
                                    <div className="text-xs text-slate-500">{formatContact(supplier)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${supplier.isActive
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-slate-100 text-slate-800'
                                        }`}>
                                        {supplier.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <span className="text-sm font-medium text-slate-900 mr-2">
                                            {supplier.performanceRating ? supplier.performanceRating.toFixed(1) : 'N/A'}
                                        </span>
                                        {supplier.performanceRating && supplier.performanceRating < 3 && (
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                    {supplier.totalPurchases.toLocaleString()} MT
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => onViewSupplier(supplier)}
                                            className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        {canEdit && (
                                            <button
                                                onClick={() => onEditSupplier(supplier)}
                                                className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                                title="Edit Supplier"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => onDeleteSupplier(supplier.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                title="Delete Supplier"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {paginatedSuppliers.length === 0 && (
                    <div className="text-center py-12">
                        <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No suppliers found</h3>
                        <p className="text-slate-500">
                            {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Get started by adding your first supplier'}
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                    <div className="text-sm text-slate-700">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedSuppliers.length)} of {sortedSuppliers.length} suppliers
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
