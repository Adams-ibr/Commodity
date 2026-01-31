import React from 'react';
import { User, InventoryItem, AuditLogEntry, ComplianceRule, UserRole, Transaction } from '../types';
import { InventoryStats } from './InventoryStats';
import { TransactionForm } from './TransactionForm';
import { ComplianceDashboard } from './ComplianceDashboard';
import { ShieldCheck, Activity, AlertCircle, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface RoleDashboardProps {
  user: User;
  inventory: InventoryItem[];
  auditLogs: AuditLogEntry[];
  complianceRules: ComplianceRule[];
  transactions?: Transaction[]; // Added transactions prop
  onCommitTransaction: (data: any) => void;
  onApproveTransaction?: (id: string) => void; // Added approve handler
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  user,
  inventory,
  auditLogs,
  complianceRules,
  transactions = [],
  onCommitTransaction,
  onApproveTransaction
}) => {
  // --- Helper Components ---

  const QuickStatsWidget = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Total Movement (Today)</p>
          <p className="text-2xl font-bold text-slate-800">55,000 L</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-amber-100 rounded-full text-amber-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-slate-800">
            {inventory.filter(i => i.status === 'Low').length}
          </p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center space-x-4">
        <div className="p-3 bg-green-100 rounded-full text-green-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-slate-500 font-medium">Compliance Status</p>
          <p className="text-2xl font-bold text-slate-800">98%</p>
        </div>
      </div>
    </div>
  );

  const ApprovalQueue = () => {
    // Filter transactions that are pending and belong to this location (simplified logic)
    const pending = transactions.filter(t => t.status === 'PENDING');
    
    if (pending.length === 0) return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-amber-200 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-600" />
          Pending Approvals
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
            {pending.length} Action(s) Required
          </span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500">
                <tr>
                   <th className="px-4 py-2">Type</th>
                   <th className="px-4 py-2">Product</th>
                   <th className="px-4 py-2">Volume</th>
                   <th className="px-4 py-2">Submitted By</th>
                   <th className="px-4 py-2 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {pending.map(tx => (
                 <tr key={tx.id}>
                    <td className="px-4 py-3 font-medium text-slate-700">{tx.type}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.product}</td>
                    <td className="px-4 py-3 text-slate-600">{tx.volume.toLocaleString()} L</td>
                    <td className="px-4 py-3 text-slate-500">{tx.performedBy}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                       {onApproveTransaction && (
                         <button 
                           onClick={() => onApproveTransaction(tx.id)}
                           className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                         >
                           <CheckCircle className="w-3 h-3 mr-1" /> Approve
                         </button>
                       )}
                    </td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    );
  };

  const RecentActivityList = ({ limit = 5 }: { limit?: number }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-600" />
        Recent Activity Log
      </h3>
      <div className="space-y-4">
        {auditLogs.slice(0, limit).map(log => (
          <div key={log.id} className="flex items-start pb-4 border-b border-slate-100 last:border-0 last:pb-0">
            <div className={`w-2 h-2 mt-2 rounded-full mr-4 ${
              log.action === 'LOSS' ? 'bg-red-500' : 'bg-indigo-500'
            }`}></div>
            <div className="flex-1">
              <div className="flex justify-between">
                <p className="text-sm font-medium text-slate-800">{log.action}</p>
                <span className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{log.details}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                  {log.user}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Hash: {log.ipHash.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>
        ))}
        {auditLogs.length === 0 && (
            <p className="text-sm text-slate-400 italic">No recent activity recorded.</p>
        )}
      </div>
    </div>
  );

  // --- Role Specific Layouts ---

  // 1. AUDITOR VIEW: Read-only, focus on Compliance & Logs
  if (user.role === UserRole.AUDITOR) {
    return (
      <div className="space-y-6">
        <div className="bg-indigo-900 text-white p-6 rounded-lg mb-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">Auditor Dashboard</h2>
              <p className="text-indigo-200 text-sm">
                Regulatory Oversight View. Read-only access enabled.
              </p>
            </div>
            <div className="hidden md:block bg-indigo-800 px-4 py-2 rounded border border-indigo-700">
               <span className="text-xs font-mono text-indigo-300">SESSION ID</span>
               <div className="font-mono font-bold text-white">AUD-SEC-8892</div>
            </div>
          </div>
        </div>
        
        <QuickStatsWidget />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-700">Live Inventory Monitoring</h3>
            <InventoryStats items={inventory} />
          </div>
          <div className="space-y-6">
            <RecentActivityList limit={8} />
          </div>
        </div>

        <div className="mt-8">
            <ComplianceDashboard rules={complianceRules} />
        </div>
      </div>
    );
  }

  // 2. SUPER ADMIN VIEW: Global View
  if (user.role === UserRole.SUPER_ADMIN) {
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-end mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Global Command Center</h2>
                <p className="text-slate-500">Overview of all Depots and Stations</p>
            </div>
         </div>

        <QuickStatsWidget />
        <ApprovalQueue />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <InventoryStats items={inventory} />
            <RecentActivityList limit={5} />
          </div>
          <div className="lg:col-span-1">
             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-800 block mb-1">System Notice:</span>
                Admin privileges enabled. All actions are logged with high-priority audit flags.
             </div>
             <TransactionForm inventory={inventory} userRole={user.role} onCommit={onCommitTransaction} />
          </div>
        </div>
      </div>
    );
  }

  // 3. OPERATIONAL ROLES (Depot Manager, Station Manager, Inventory Officer)
  const isManager = user.role === UserRole.DEPOT_MANAGER || user.role === UserRole.STATION_MANAGER;
  
  return (
    <div className="space-y-6">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {user.role === UserRole.INVENTORY_OFFICER ? 'Inventory Operations' : 'Location Management'}
          </h2>
          <p className="text-slate-500">
              Location: <span className="font-semibold text-indigo-700">{user.location}</span>
          </p>
        </div>
        {user.role === UserRole.INVENTORY_OFFICER && (
           <div className="bg-amber-50 text-amber-800 px-4 py-2 rounded-lg border border-amber-200 text-sm">
             Draft Mode: Transactions require approval
           </div>
        )}
      </div>

      <QuickStatsWidget />
      
      {/* Managers see the Approval Queue */}
      {isManager && <ApprovalQueue />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Inventory Visualization */}
        <div className="lg:col-span-2">
           <InventoryStats items={inventory} />
           <div className="mt-6">
             <RecentActivityList />
           </div>
        </div>

        {/* Right Col: Action Center */}
        <div className="lg:col-span-1">
          <TransactionForm 
             inventory={inventory} 
             userRole={user.role}
             onCommit={onCommitTransaction} 
          />
          
          {user.role === UserRole.INVENTORY_OFFICER && (
             <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-500">
                <strong>Process Note:</strong> Ensure physical dip-stick reading matches digital entry before submitting.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};