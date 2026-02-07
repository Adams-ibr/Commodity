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
  Users,
  Calculator
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
import { UserManagement } from './components/UserManagement';
import { ReconciliationModule } from './components/ReconciliationModule';
import { CacheStatus } from './components/CacheStatus';
import { OfflineStatus } from './components/OfflineStatus';
import { SignIn } from './components/SignIn';
import { useAuth } from './context/AuthContext';
import { COMPLIANCE_RULES } from './constants/compliance';
import { printReceipt, createReceiptData } from './utils/receiptPrinter';
import { InventoryItem, Transaction, AuditLogEntry, UserRole, TransactionType, User } from './types';

import { api } from './services/api';
import { cacheManager } from './utils/cacheManager';
import { offlineManager } from './utils/offlineManager';
import { reconciliationScheduler } from './utils/reconciliationScheduler';

function App() {
  const { user: currentUser, loading: authLoading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load Data on Mount and Tab Change with Offline Support
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (offlineManager.isCurrentlyOnline()) {
          // Online: Fetch fresh data from API
          const [invData, txData] = await Promise.all([
            api.inventory.getAll(),
            api.transactions.getAll()
          ]);

          setInventory(invData);
          setTransactions(txData);

          // Cache data for offline use
          offlineManager.cacheData('inventory', invData);
          offlineManager.cacheData('transactions', txData);

          // Also fetch audit logs separately
          api.audit.getAll()
            .then(auditData => {
              setAuditLogs(auditData);
              offlineManager.cacheData('auditLogs', auditData);
            })
            .catch(console.error);

        } else {
          // Offline: Use cached data
          console.log('Loading cached data for offline use');
          const cachedInventory = offlineManager.getCachedData('inventory');
          const cachedTransactions = offlineManager.getCachedData('transactions');
          const cachedAuditLogs = offlineManager.getCachedData('auditLogs');

          setInventory(cachedInventory);
          setTransactions(cachedTransactions);
          setAuditLogs(cachedAuditLogs);
        }
      } catch (error) {
        console.error('Failed to load data:', error);

        // Fallback to cached data on error
        const cachedInventory = offlineManager.getCachedData('inventory');
        const cachedTransactions = offlineManager.getCachedData('transactions');
        const cachedAuditLogs = offlineManager.getCachedData('auditLogs');

        if (cachedInventory.length > 0 || cachedTransactions.length > 0) {
          console.log('Using cached data due to network error');
          setInventory(cachedInventory);
          setTransactions(cachedTransactions);
          setAuditLogs(cachedAuditLogs);
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [activeTab]);

  // Initialize cache manager on app startup
  useEffect(() => {
    // Start cache manager when app loads
    cacheManager.start();

    // Set up event listener for cache clearing notifications
    const handleCacheCleared = (event: CustomEvent) => {
      console.log('Cache cleared:', event.detail);
      // Optionally show a toast notification or update UI
    };

    window.addEventListener('cacheCleared', handleCacheCleared as EventListener);

    // Cleanup on component unmount
    return () => {
      cacheManager.stop();
      reconciliationScheduler.stop();
      window.removeEventListener('cacheCleared', handleCacheCleared as EventListener);
    };
  }, []); // Empty dependency array - run only once on mount

  // Initialize reconciliation scheduler when user is logged in
  useEffect(() => {
    if (currentUser) {
      reconciliationScheduler.start(
        () => inventory,
        () => transactions,
        () => currentUser?.name || 'System',
        (results) => {
          console.log('[App] Reconciliation completed:', results.length, 'records');
        }
      );
    }

    return () => {
      reconciliationScheduler.stop();
    };
  }, [currentUser, inventory, transactions]);

  // --- Data Filtering Logic based on Role & Location ---
  const getFilteredInventory = () => {
    if (!currentUser) return [];

    // Super Admin, Admin, and Accountant see all inventory
    if (currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.ACCOUNTANT) {
      return inventory;
    }

    return inventory.filter(item =>
      item.location.includes(currentUser.location) ||
      currentUser.location.includes('HQ')
    );
  };

  const getFilteredLogs = () => {
    if (!currentUser) return [];

    // Super Admin, Admin, and Accountant see all logs
    if (currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.ACCOUNTANT) {
      return auditLogs;
    }

    return auditLogs.filter(log =>
      log.user === currentUser.name ||
      log.details.includes(currentUser.location)
    );
  };

  const getFilteredTransactions = () => {
    if (!currentUser) return [];

    // Super Admin, Admin, Manager, and Accountant see all transactions
    if (currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.MANAGER ||
      currentUser.role === UserRole.ACCOUNTANT) {
      return transactions;
    }

    // CASHIER: Only see their own sales (performedBy matches their name)
    if (currentUser.role === UserRole.CASHIER) {
      return transactions.filter(t => t.performedBy === currentUser.name);
    }

    // Fallback: filter by location
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
    // Sales are now automatically approved for all roles as per new requirement
    const status = 'APPROVED';

    // Create new transaction object via API
    // IMPORTANT: Include unitPrice and totalAmount for receipts
    const txData = {
      type: data.type,
      product: data.product,
      volume: data.volume,
      sourceId: data.sourceId,
      destination: data.destination || '',
      customerId: data.customerId,
      customerName: data.customerName,
      refDoc: data.refDoc,
      datePrefix: data.datePrefix, // For atomic invoice generation
      performedBy: currentUser.name,
      status: status,
      unitPrice: data.unitPrice,     // Pass through for receipt
      totalAmount: data.totalAmount  // Pass through for receipt
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

    details += `. Ref: ${newTx.referenceDoc}`;

    if (status === 'APPROVED') {
      updateInventoryState(newTx);
      addAuditLog('TRANSACTION_COMMIT', details);

      // Auto-print receipt - use data from the created transaction plus original price data
      printReceipt(createReceiptData({
        ...newTx,
        sourceId: newTx.source,
        refDoc: newTx.referenceDoc,
        unitPrice: data.unitPrice,     // Use original price from sales form
        totalAmount: data.totalAmount  // Use original total from sales form
      }, inventory));
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
        return <SalesModule inventory={visibleInventory} transactions={visibleTransactions} onCommitTransaction={handleTransactionCommit} />;
      case 'customers':
        return <CustomerManager userRole={currentUser.role} transactions={visibleTransactions} onAuditLog={addAuditLog} />;
      case 'restock':
        return <RestockModule inventory={visibleInventory} onCommitTransaction={handleTransactionCommit} />;
      case 'compliance':
        return <ComplianceDashboard rules={COMPLIANCE_RULES} />;
      case 'locations':
        return <LocationsManager userRole={currentUser.role} userName={currentUser.name} />;
      case 'tanks':
        return <TankManager userRole={currentUser.role} userName={currentUser.name} />;
      case 'pricing':
        return <PricingManager userRole={currentUser.role} userName={currentUser.name} />;
      case 'reconciliation':
        return (
          <ReconciliationModule
            userRole={currentUser.role}
            userName={currentUser.name}
            inventory={visibleInventory}
            transactions={visibleTransactions}
            onAuditLog={addAuditLog}
          />
        );
      case 'users':
        return <UserManagement currentUserRole={currentUser.role} currentUserName={currentUser.name} />;
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
          <div className="flex items-center justify-center flex-1">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto" />
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

          {/* Hide Add Inventory for Cashiers */}
          {currentUser.role !== UserRole.CASHIER && (
            <NavItem id="restock" label="Add Inventory" icon={Layers} />
          )}

          {/* Compliance is key for Auditors/Admins */}
          <NavItem id="compliance" label="SRS Compliance" icon={FileCheck} />

          {/* User Management - Admin/Super Admin only */}
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) && (
            <NavItem id="users" label="User Management" icon={Users} />
          )}

          {/* Locations & Tanks - Admin/Super Admin only */}
          {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) && (
            <>
              <NavItem id="locations" label="Locations" icon={MapPin} />
              <NavItem id="tanks" label="Tank Management" icon={Fuel} />
              <NavItem id="pricing" label="Price Management" icon={DollarSign} />
            </>
          )}

          {/* Reconciliation - Admin/Manager/Accountant */}
          {(currentUser.role === UserRole.SUPER_ADMIN ||
            currentUser.role === UserRole.ADMIN ||
            currentUser.role === UserRole.MANAGER ||
            currentUser.role === UserRole.ACCOUNTANT) && (
              <NavItem id="reconciliation" label="Reconciliation" icon={Calculator} />
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
            <CacheStatus showInHeader={true} />
            <OfflineStatus showInHeader={true} />
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