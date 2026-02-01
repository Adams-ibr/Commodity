import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Truck,
  Settings,
  AlertTriangle,
  MapPin,
  Fuel,
  DollarSign,
  LogOut,
  Menu,
  X,
  Layers,
  UserCircle,
  FileCheck,
  History,
  Users
} from 'lucide-react';
import { InventoryManager } from './components/InventoryManager';
import { InventoryStats } from './components/InventoryStats';
import { AuditView } from './components/AuditView';
import { RoleDashboard } from './components/RoleDashboard';
import { SalesModule } from './components/SalesModule';
import { RestockModule } from './components/RestockModule';
import { ComplianceDashboard } from './components/ComplianceDashboard';
import { LocationsManager } from './components/LocationsManager';
import { TankManager } from './components/TankManager';
import { PricingManager } from './components/PricingManager';
import { CustomerManager } from './components/CustomerManager';
import { SignIn } from './components/SignIn';
import { useAuth } from './context/AuthContext';
import { COMPLIANCE_RULES } from './constants/compliance';
import { printReceipt, createReceiptData } from './utils/receiptPrinter';
import { InventoryItem, Transaction, AuditLogEntry, UserRole, TransactionType, User } from './types';

import { api } from './services/api';

function App() {
  const { user: currentUser, loading: authLoading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Data on Mount and Tab Change
  useEffect(() => {
    const loadData = async () => {
      // Only show full loading spinner on initial load or critical updates
      // setIsLoading(true); 
      try {
        const [invData, txData] = await Promise.all([
          api.inventory.getAll(),
          api.transactions.getAll()
        ]);
        setInventory(invData);
        setTransactions(txData);

        // Audit logs can be heavy, load only on initial mount or specific tab?
        // For now, let's keep it simple and load all, but maybe separately for audit
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setIsLoading(false);
    };
    loadData();

    // Also fetch audit logs separately on mount only to save bandwidth
    api.audit.getAll().then(setAuditLogs).catch(console.error);

  }, [activeTab]);

  // --- Data Filtering Logic based on Role & Location ---
  const getFilteredInventory = () => {
    if (!currentUser) return [];

    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.AUDITOR) {
      return inventory;
    }

    return inventory.filter(item =>
      item.location.includes(currentUser.location) ||
      currentUser.location.includes('HQ')
    );
  };

  const getFilteredLogs = () => {
    if (!currentUser) return [];

    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.AUDITOR) {
      return auditLogs;
    }

    return auditLogs.filter(log =>
      log.user === currentUser.name ||
      log.details.includes(currentUser.location)
    );
  };

  const getFilteredTransactions = () => {
    if (!currentUser) return [];

    if (currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.AUDITOR) {
      return transactions;
    }

    // Filter transactions relevant to user's location
    return transactions.filter(t =>
      t.source.includes(currentUser.location) ||
      t.performedBy === currentUser.name
    );
  };

  // --- Transaction Logic ---

  const addAuditLog = (action: string, details: string) => {
    if (!currentUser) return;
    api.audit.log(action, details, currentUser.name, currentUser.role);
    // Optimistic update for UI
    const newLog: AuditLogEntry = {
      id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      details,
      user: currentUser.name,
      role: currentUser.role,
      ipHash: '...'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const updateInventoryState = async (tx: Transaction) => {
    // Find item
    const item = inventory.find(i => i.id === tx.source);
    if (!item) return;

    let newVol = item.currentVolume;
    if (tx.type === 'SALE' || tx.type === 'TRANSFER' || tx.type === 'LOSS') {
      newVol -= tx.volume;
    } else if (tx.type === 'RECEIPT') {
      newVol += tx.volume;
    }

    const updatedItem = { ...item, currentVolume: newVol };

    // Update DB
    await api.inventory.update(updatedItem);

    // Update Local State
    setInventory(prev => prev.map(i => i.id === item.id ? updatedItem : i));
  };

  const handleAddInventory = async (newItem: InventoryItem) => {
    const created = await api.inventory.create(newItem);
    if (created) {
      setInventory(prev => [...prev, created]);
      addAuditLog('INVENTORY_ADD', `Added new inventory item: ${newItem.location} (${newItem.product})`);
    }
  };

  const handleUpdateInventory = async (updatedItem: InventoryItem) => {
    await api.inventory.update(updatedItem);
    setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    addAuditLog('INVENTORY_UPDATE', `Updated inventory item: ${updatedItem.location}`);
  };

  const handleDeleteInventory = (id: string) => {
    // Currently dependent on component implementation if it exposes delete
    const item = inventory.find(i => i.id === id);
    if (item) {
      setInventory(prev => prev.filter(i => i.id !== id));
      addAuditLog('INVENTORY_DELETE', `Deleted inventory item: ${item.location}`);
    }
  };

  const handleTransactionCommit = async (data: any) => {
    if (!currentUser) return;

    // Determine status based on role
    // Officers -> Pending
    // Managers/Admins -> Approved immediately
    const isApprover = currentUser.role === UserRole.DEPOT_MANAGER ||
      currentUser.role === UserRole.STATION_MANAGER ||
      currentUser.role === UserRole.SUPER_ADMIN;

    const status = isApprover ? 'APPROVED' : 'PENDING';

    // Create new transaction object via API
    const txData = {
      type: data.type,
      product: data.product,
      volume: data.volume,
      sourceId: data.sourceId,
      destination: data.destination || '',
      customerId: data.customerId,
      customerName: data.customerName,
      refDoc: data.refDoc,
      performedBy: currentUser.name,
      status: status
    };

    const newTx = await api.transactions.create(txData);
    if (!newTx) return;

    setTransactions([newTx, ...transactions]);

    const sourceItem = inventory.find(i => i.id === data.sourceId);
    const locationName = sourceItem ? sourceItem.location : 'Unknown Source';

    // Construct detailed log message
    let details = `${data.type} of ${data.volume.toLocaleString()}L ${data.product}`;
    if (data.type === 'TRANSFER') {
      details += ` from ${locationName} to ${data.destination || 'External'}`;
    } else {
      details += ` at ${locationName}`;
    }

    // Add customer info if present
    if (data.customerName) {
      details += ` for ${data.customerName} (${data.type === 'SALE' ? 'Sale' : 'Tx'})`;
    }

    details += `. Ref: ${data.refDoc}`;

    if (status === 'APPROVED') {
      updateInventoryState(newTx);
      addAuditLog('TRANSACTION_COMMIT', details);

      // Auto-print receipt
      printReceipt(createReceiptData({ ...txData, refDoc: data.refDoc }, inventory));
    } else {
      addAuditLog('TRANSACTION_SUBMIT', `${details} (Pending Approval)`);
      alert("Transaction submitted for approval.");
    }
  };

  const handleTransactionApprove = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    // Update status
    const updatedTransactions = transactions.map(t =>
      t.id === txId ? { ...t, status: 'APPROVED' as const } : t
    );
    setTransactions(updatedTransactions);

    // Update Inventory
    updateInventoryState(tx);

    // Find location name for log
    const sourceItem = inventory.find(i => i.id === tx.source);
    const locationName = sourceItem ? sourceItem.location : 'Unknown Source';

    // Construct detailed log message for approval
    let details = `Approved ${tx.type} of ${tx.volume.toLocaleString()}L ${tx.product}`;
    if (tx.type === 'TRANSFER') {
      details += ` from ${locationName} to ${tx.destination || 'External'}`;
    } else {
      details += ` at ${locationName}`;
    }
    details += `. Ref: ${tx.referenceDoc}. Approved by ${currentUser?.name}`;

    addAuditLog('TRANSACTION_APPROVE', details);
    alert("Transaction approved and ledger updated.");
  };

  const handleLogout = async () => {
    await signOut();
    setActiveTab('dashboard');
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Show SignIn if not logged in (internal app - no sign up)
  if (!currentUser) {
    return <SignIn onSignIn={signIn} />;
  }

  // Define contents based on active tab
  const renderContent = () => {
    const visibleInventory = getFilteredInventory();
    const visibleLogs = getFilteredLogs();
    const visibleTransactions = getFilteredTransactions();

    switch (activeTab) {
      case 'dashboard':
        return (
          <RoleDashboard
            user={currentUser}
            inventory={visibleInventory}
            auditLogs={visibleLogs}
            transactions={visibleTransactions}
            complianceRules={COMPLIANCE_RULES}
            onCommitTransaction={handleTransactionCommit}
            onApproveTransaction={handleTransactionApprove}
          />
        );
      case 'inventory':
        return (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6">
              <InventoryManager
                inventory={visibleInventory}
                userRole={currentUser.role}
                onAdd={handleAddInventory}
                onUpdate={handleUpdateInventory}
                onDelete={handleDeleteInventory}
              />
            </div>
          </div>
        );
      case 'audit':
        return <AuditView logs={visibleLogs} />;
      case 'sales':
        return <SalesModule inventory={visibleInventory} onCommitTransaction={handleTransactionCommit} />;
      case 'customers':
        return <CustomerManager userRole={currentUser.role} transactions={visibleTransactions} onAuditLog={addAuditLog} />;
      case 'restock':
        return <RestockModule inventory={visibleInventory} onCommitTransaction={handleTransactionCommit} />;
      case 'compliance':
        return <ComplianceDashboard rules={COMPLIANCE_RULES} />;
      case 'locations':
        return <LocationsManager />;
      case 'tanks':
        return <TankManager userRole={currentUser.role} />;
      case 'pricing':
        return <PricingManager userRole={currentUser.role} />;
      default:
        return <div className="text-center p-10 text-slate-500">Module under construction</div>;
    }
  };

  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${activeTab === id
        ? 'bg-indigo-800 text-white'
        : 'text-indigo-100 hover:bg-indigo-800/50'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-indigo-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b border-indigo-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Galaltix Energy</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-indigo-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />

          {/* Inventory is relevant for everyone */}
          <NavItem id="inventory" label="Inventory Ledger" icon={Layers} />

          {/* Audit Trail is vital for Auditors and Admins, but Managers can see their history */}
          <NavItem id="audit" label="Audit Trail" icon={History} />

          <NavItem id="sales" label="Sales & Dealers" icon={UserCircle} />
          <NavItem id="customers" label="Customer Management" icon={Users} />
          <NavItem id="restock" label="Add Inventory" icon={Layers} />

          {/* Compliance is key for Auditors/Admins */}
          <NavItem id="compliance" label="SRS Compliance" icon={FileCheck} />

          {/* Locations & Tanks - Admin/Manager only */}
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.DEPOT_MANAGER) && (
            <>
              <NavItem id="locations" label="Locations" icon={MapPin} />
              <NavItem id="tanks" label="Tank Management" icon={Fuel} />
              <NavItem id="pricing" label="Price Management" icon={DollarSign} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-lg bg-indigo-950/50">
            <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center">
              <span className="text-xs font-bold">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.name}</p>
              <p className="text-xs text-indigo-300 truncate">{currentUser.role}</p>
            </div>
            <button onClick={handleLogout} className="hover:bg-indigo-800 p-1 rounded transition-colors" title="Sign Out">
              <LogOut className="w-4 h-4 text-indigo-400 cursor-pointer hover:text-white" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-4 text-slate-500 lg:hidden hover:text-indigo-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
              {activeTab === 'dashboard' ? 'Overview' : activeTab.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-xs text-slate-400">System Status</span>
              <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Operational
              </span>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <UserCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;