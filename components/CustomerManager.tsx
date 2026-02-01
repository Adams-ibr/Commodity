import React, { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { CustomerList } from './CustomerList';
import { CustomerForm } from './CustomerForm';
import { CustomerDetails } from './CustomerDetails';
import { Customer, Transaction, UserRole } from '../types';
import { api } from '../services/api';

interface CustomerManagerProps {
  userRole: UserRole;
  transactions: Transaction[];
  onCustomerSelect?: (customer: Customer) => void;
  onAuditLog?: (action: string, details: string) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  userRole,
  transactions,
  onCustomerSelect
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for development - replace with actual API calls
  useEffect(() => {
    const loadCustomers = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with actual API call
        // const customerData = await api.customers.getAll();
        
        // Mock data for development
        const mockCustomers: Customer[] = [
          {
            id: 'cust-001',
            name: 'Adebayo Petroleum Ltd',
            type: 'Dealer',
            contactInfo: {
              phone: '+234 803 123 4567',
              email: 'contact@adebayopetroleum.com',
              address: '123 Lagos-Ibadan Expressway, Lagos'
            },
            status: 'Active',
            createdDate: '2024-01-15T10:00:00Z',
            lastTransactionDate: '2024-01-30T14:30:00Z',
            totalPurchases: 2500000,
            averageTransactionSize: 50000,
            notes: 'Major dealer with excellent payment history'
          },
          {
            id: 'cust-002',
            name: 'John Okafor',
            type: 'End User',
            contactInfo: {
              phone: '+234 701 987 6543',
              email: 'john.okafor@email.com'
            },
            status: 'Active',
            createdDate: '2024-01-20T09:15:00Z',
            lastTransactionDate: '2024-01-28T16:45:00Z',
            totalPurchases: 150000,
            averageTransactionSize: 15000,
            notes: 'Regular customer, prefers PMS'
          },
          {
            id: 'cust-003',
            name: 'Kano Transport Services',
            type: 'Dealer',
            contactInfo: {
              phone: '+234 802 555 7890',
              address: '45 Murtala Mohammed Way, Kano'
            },
            status: 'Inactive',
            createdDate: '2023-12-10T11:30:00Z',
            lastTransactionDate: '2024-01-10T08:20:00Z',
            totalPurchases: 800000,
            averageTransactionSize: 40000,
            notes: 'Account suspended pending payment resolution'
          }
        ];
        
        setCustomers(mockCustomers);
      } catch (error) {
        console.error('Failed to load customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const handleAddCustomer = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
  };

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'> | Customer) => {
    setIsSubmitting(true);
    try {
      if ('id' in customerData) {
        // Update existing customer
        // TODO: Replace with actual API call
        // const updatedCustomer = await api.customers.update(customerData);
        
        const updatedCustomer = customerData as Customer;
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        
        // TODO: Add audit log
        // addAuditLog('CUSTOMER_UPDATE', `Updated customer: ${updatedCustomer.name}`);
        
        console.log('Customer updated:', updatedCustomer);
      } else {
        // Create new customer
        // TODO: Replace with actual API call
        // const newCustomer = await api.customers.create(customerData);
        
        const newCustomer: Customer = {
          ...customerData,
          id: `cust-${Date.now()}`, // Generate temporary ID
        };
        
        setCustomers(prev => [...prev, newCustomer]);
        
        // TODO: Add audit log
        // addAuditLog('CUSTOMER_CREATE', `Created new customer: ${newCustomer.name}`);
        
        console.log('Customer created:', newCustomer);
      }
      
      setShowForm(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Failed to save customer:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Check if customer has transactions
    const customerTransactions = transactions.filter(tx => 
      tx.customerId === customerId || tx.customerName === customer.name
    );

    if (customerTransactions.length > 0) {
      alert('Cannot delete customer with existing transactions. Please contact administrator.');
      return;
    }

    if (!confirm(`Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // TODO: Replace with actual API call
      // await api.customers.delete(customerId);
      
      setCustomers(prev => prev.filter(c => c.id !== customerId));
      
      // TODO: Add audit log
      // addAuditLog('CUSTOMER_DELETE', `Deleted customer: ${customer.name}`);
      
      console.log('Customer deleted:', customer.name);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer. Please try again.');
    }
  };

  const handleStatusChange = async (customerId: string, status: 'Active' | 'Inactive') => {
    try {
      const customer = customers.find(c => c.id === customerId);
      if (!customer) return;

      const updatedCustomer = { ...customer, status };
      
      // TODO: Replace with actual API call
      // await api.customers.update(updatedCustomer);
      
      setCustomers(prev => prev.map(c => c.id === customerId ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer);
      
      // TODO: Add audit log
      // addAuditLog('CUSTOMER_STATUS_CHANGE', `Changed customer ${customer.name} status to ${status}`);
      
      console.log('Customer status updated:', updatedCustomer);
    } catch (error) {
      console.error('Failed to update customer status:', error);
      alert('Failed to update customer status. Please try again.');
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedCustomer(null);
  };

  const canAdd = userRole === UserRole.SUPER_ADMIN || 
                 userRole === UserRole.DEPOT_MANAGER || 
                 userRole === UserRole.STATION_MANAGER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Customer Management</h1>
            <p className="text-slate-600">Manage customer information and track purchase history</p>
          </div>
        </div>
        {canAdd && (
          <button
            onClick={handleAddCustomer}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        )}
      </div>

      {/* Customer List */}
      <CustomerList
        customers={customers}
        userRole={userRole}
        onViewCustomer={handleViewCustomer}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        isLoading={isLoading}
      />

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={editingCustomer || undefined}
          onSave={handleSaveCustomer}
          onCancel={handleCloseForm}
          isLoading={isSubmitting}
        />
      )}

      {/* Customer Details Modal */}
      {showDetails && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          transactions={transactions}
          userRole={userRole}
          onClose={handleCloseDetails}
          onEdit={handleEditCustomer}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};