import React from 'react';
import { AuditLogEntry } from '../types';
import { ShieldAlert, Search } from 'lucide-react';

interface AuditViewProps {
  logs: AuditLogEntry[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Immutable Audit Trail
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Regulatory compliance log. All actions are hashed and timestamped.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search logs..." 
            className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 uppercase font-medium">
            <tr>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Details</th>
              <th className="px-6 py-3 text-right">Integrity Hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 font-medium text-slate-800">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    log.action.includes('ALERT') ? 'bg-red-100 text-red-800' : 
                    log.action.includes('LOGIN') ? 'bg-blue-100 text-blue-800' : 
                    'bg-green-100 text-green-800'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600">{log.user}</td>
                <td className="px-6 py-4 text-slate-500">{log.role}</td>
                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.details}>
                  {log.details}
                </td>
                <td className="px-6 py-4 text-right font-mono text-xs text-slate-400">
                  {log.ipHash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};