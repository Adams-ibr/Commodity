import React, { useState, useMemo } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, TrendingUp, Filter, FileText, Edit } from 'lucide-react';
import { Customer, Transaction, ProductType, TransactionType, UserRole } from '../types';

interface CustomerDetailsProps {
  customer: Customer;
  transactions: Transaction[];
  userRole: UserRole;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onStatusChange: (customerId: string, status: 'Active' | 'Inactive') => void;
}

export const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customer,
  transactions,
  userRole,
  onClose,
  onEdit,
  onStatusChange
}) => {
  const [transactionFilter, setTransactionFilter] = useState<{
    product: ProductType | 'all';
    type: TransactionType | 'all';
    dateRange: 'all' | '30days' | '90days' | '1year';
  }>({
    product: 'all',
    type: 'all',
    dateRange: 'all'
  });

  // Filter transactions based on customer and filters
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(tx => 
      tx.customerId === customer.id || tx.customerName === customer.name
    );

    if (transactionFilter.product !== 'all') {
      filtered = filtered.filter(tx => tx.product === transactionFilter.product);
    }

    if (transactionFilter.type !== 'all') {
      filtered = filtered.filter(tx => tx.type === transactionFilter.type);
    }

    if (transactionFilter.dateRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (transactionFilter.dateRange) {
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= cutoffDate);
    }

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [transactions, customer, transactionFilter]);

  // Calculate customer statistics
  const customerStats = useMemo(() => {
    const customerTransactions = transactions.filter(tx => 
      tx.customerId === customer.id || tx.customerName === customer.name
    );

    const totalVolume = customerTransactions.reduce((sum, tx) => sum + tx.volume, 0);
    const totalTransactions = customerTransactions.length;
    const avgTransactionSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    const productBreakdown = customerTransactions.reduce((acc, tx) => {
      acc[tx.product] = (acc[tx.product] || 0) + tx.volume;
      return acc;
    }, {} as Record<ProductType, number>);

    const last30Days = customerTransactions.filter(tx => 
      new Date(tx.timestamp) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    return {
      totalVolume,
      totalTransactions,
      avgTransactionSize,
      productBreakdown,
      recentActivity: last30Days.length,
      lastPurchase: customerTransactions[0]?.timestamp
    };
  }, [transactions, customer]);

  const canEdit = userRole === UserRole.SUPER_ADMIN || 
                  userRole === UserRole.DEPOT_MANAGER || 
                  userRole === UserRole.STATION_MANAGER;

  const canChangeStatus = userRole === UserRole.SUPER_ADMIN || userRole === UserRole.DEPOT_MANAGER;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{customer.name}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.type === 'Dealer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {customer.type}
                </span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  customer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {customer.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onEdit(customer)}
                className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Customer ID</label>
                    <p className="text-slate-900">{customer.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Created Date</label>
                    <p className="text-slate-900">{formatDate(customer.createdDate)}</p>
                  </div>
                  {canChangeStatus && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Status</label>
                      <select
                        value={customer.status}
                        onChange={(e) => onStatusChange(customer.id, e.target.value as 'Active' | 'Inactive')}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {customer.contactInfo?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-900">{customer.contactInfo.phone}</span>
                    </div>
                  )}
                  {customer.contactInfo?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-900">{customer.contactInfo.email}</span>
                    </div>
                  )}
                  {customer.contactInfo?.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span className="text-slate-900">{customer.contactInfo.address}</span>
                    </div>
                  )}
                  {!customer.contactInfo?.phone && !customer.contactInfo?.email && !customer.contactInfo?.address && (
                    <p className="text-slate-500 italic">No contact information available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Customer Statistics */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Customer Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{customerStats.totalTransactions}</div>
                  <div className="text-sm text-slate-600">Total Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{customerStats.totalVolume.toLocaleString()}L</div>
                  <div className="text-sm text-slate-600">Total Volume</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(customerStats.avgTransactionSize).toLocaleString()}L</div>
                  <div className="text-sm text-slate-600">Avg Transaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{customerStats.recentActivity}</div>
                  <div className="text-sm text-slate-600">Last 30 Days</div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </h3>
                <p className="text-slate-700">{customer.notes}</p>
              </div>
            )}

            {/* Transaction History */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Transaction History ({filteredTransactions.length})
                  </h3>
                </div>

                {/* Transaction Filters */}
                <div className="flex flex-wrap gap-4">
                  <select
                    value={transactionFilter.product}
                    onChange={(e) => setTransactionFilter(prev => ({ ...prev, product: e.target.value as any }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Products</option>
                    {Object.values(ProductType).map(product => (
                      <option key={product} value={product}>{product}</option>
                    ))}
                  </select>

                  <select
                    value={transactionFilter.type}
                    onChange={(e) => setTransactionFilter(prev => ({ ...prev, type: e.target.value as any }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Types</option>
                    {Object.values(TransactionType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <select
                    value={transactionFilter.dateRange}
                    onChange={(e) => setTransactionFilter(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All Time</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="90days">Last 90 Days</option>
                    <option value="1year">Last Year</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Volume</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {formatDate(transaction.timestamp)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {transaction.type}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {transaction.product}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {transaction.volume.toLocaleString()}L
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {transaction.referenceDoc}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No transactions found</h3>
                    <p className="text-slate-500">
                      {transactionFilter.product !== 'all' || transactionFilter.type !== 'all' || transactionFilter.dateRange !== 'all'
                        ? 'Try adjusting your filters'
                        : 'This customer has no transaction history yet'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};