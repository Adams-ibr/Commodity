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
  Calculator,
  Building,
  Microscope,
  Factory,
  Ship,
  Anchor,
  Globe,
  Phone,
  Mail,
  FileEdit,
  Plus,
  Calendar,
  Receipt,
  Building2,
  Target,
  BookOpen,
  ShieldCheck,
  CheckCircle
} from 'lucide-react';

import { WarehouseManager } from './components/WarehouseManager';
import { SupplierManager } from './components/SupplierManager';
import { PurchaseContractManager } from './components/PurchaseContractManager';
import { QualityControlManager } from './components/QualityControlManager';
import { ProcessingManager } from './components/ProcessingManager';
import { BuyerManager } from './components/BuyerManager';
import { SalesContractManager } from './components/SalesContractManager';
import { ShipmentManager } from './components/ShipmentManager';
import { DocumentManager } from './components/DocumentManager';
import { AccountingManager } from './components/AccountingManager';
import { FXManager } from './components/FXManager';
import { TradeFinanceManager } from './components/TradeFinanceManager';
import { ComplianceManager } from './components/ComplianceManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AuditTrailManager } from './components/AuditTrailManager';
import { CommodityMasterManager } from './components/CommodityMasterManager';
import { UserManagement } from './components/UserManagement';
import { CacheStatus } from './components/CacheStatus';
import { OfflineStatus } from './components/OfflineStatus';
import { SignIn } from './components/SignIn';
import { useAuth } from './context/AuthContext';
import { UserRole, User } from './types_commodity';
import { api } from './services/api';

function App() {
  const { user: currentUser, loading: authLoading, signIn, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Audit Log centralized handler ---
  const addAuditLog = (action: string, details: string) => {
    if (!currentUser) return;
    try {
      api.audit.log(action, details, currentUser.name, currentUser.role);
    } catch (e) {
      console.error('Failed to log audit:', e);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setActiveTab('dashboard');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <SignIn onSignIn={signIn} />;
  }

  // Common NavItem Component
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AnalyticsDashboard userRole={currentUser.role} userName={currentUser.name} onAuditLog={addAuditLog} />;
      case 'inventory':
        return <WarehouseManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'sales-contracts':
        return <SalesContractManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'shipments':
        return <ShipmentManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'buyers':
        return <BuyerManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'suppliers':
        return <SupplierManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'contracts':
        return <PurchaseContractManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'quality':
        return <QualityControlManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'processing':
        return <ProcessingManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'documents':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Document Library</h2>
            <DocumentManager referenceType="GLOBAL" referenceId="all" title="All System Documents" onAuditLog={addAuditLog} />
          </div>
        );
      case 'users':
        return <UserManagement currentUserRole={currentUser.role} currentUserName={currentUser.name} />;
      case 'accounting':
        return <AccountingManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      case 'fx':
        return <FXManager onAuditLog={addAuditLog} />;
      case 'trade-finance':
        return <TradeFinanceManager onAuditLog={addAuditLog} />;
      case 'compliance':
        return <ComplianceManager onAuditLog={addAuditLog} />;
      case 'audit':
        return <AuditTrailManager />;
      case 'commodities':
        return <CommodityMasterManager userRole={currentUser.role} onAuditLog={addAuditLog} />;
      default:
        return <div className="text-center p-10 text-slate-500">Module under construction</div>;
    }
  };

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
            <h2 className="text-xl font-bold tracking-wider">GALALTIX</h2>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-indigo-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
          <NavItem id="inventory" label="Warehouse & Inventory" icon={Layers} />

          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Finance & Accounting</p>
            <NavItem id="accounting" label="Financial Journal" icon={BookOpen} />
            <NavItem id="fx" label="FX Management" icon={Globe} />
            <NavItem id="trade-finance" label="Trade Finance" icon={ShieldCheck} />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sales & Export</p>
            <NavItem id="buyers" label="Buyer Directory" icon={Target} />
            <NavItem id="sales-contracts" label="Sales Contracts" icon={FileText} />
            <NavItem id="shipments" label="Shipments" icon={Ship} />
            <NavItem id="compliance" label="Export Compliance" icon={CheckCircle} />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Procurement</p>
            <NavItem id="suppliers" label="Supplier Directory" icon={Building} />
            <NavItem id="contracts" label="Purchase Contracts" icon={FileText} />
            <NavItem id="commodities" label="Commodity Master" icon={Package} />
            <NavItem id="quality" label="Quality Control" icon={Microscope} />
            <NavItem id="processing" label="Processing Module" icon={Factory} />
          </div>

          <div className="pt-4 mt-4 border-t border-slate-700/50">
            <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">System Management</p>
            {(currentUser.role === UserRole.SUPER_ADMIN || currentUser.role === UserRole.ADMIN) && (
              <>
                <NavItem id="users" label="User Management" icon={Users} />
                <NavItem id="documents" label="Document Library" icon={FileText} />
                <NavItem id="audit" label="Audit Trail" icon={AlertTriangle} />
              </>
            )}
          </div>
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
              <p className="text-xs text-indigo-300 truncate">{currentUser.role.replace('_', ' ')}</p>
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