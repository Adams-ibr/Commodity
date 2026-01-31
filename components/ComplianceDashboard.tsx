import React from 'react';
import { ComplianceRule } from '../types';
import { CheckCircle2, AlertTriangle, FileText, ScrollText } from 'lucide-react';

interface ComplianceDashboardProps {
  rules: ComplianceRule[];
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ rules }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
           <FileText className="w-6 h-6 text-blue-600" />
           SRS Requirement Traceability Matrix
        </h2>
        <p className="text-slate-600 mb-6">
          System is configured to strictly enforce the Software Requirements Specification (SRS).
          Below maps active system rules to specific SRS sections.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-indigo-300 transition-colors bg-slate-50">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {rule.category}
                  </span>
                  {rule.status === 'Compliant' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <h3 className="text-md font-medium text-slate-800 mb-1">{rule.requirement}</h3>
                <div className="flex items-center gap-1 text-xs text-indigo-600 font-mono bg-indigo-50 w-fit px-2 py-1 rounded">
                   <ScrollText className="w-3 h-3" />
                   {rule.srsReference}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
                <span>Last Verified:</span>
                <span>{new Date(rule.lastChecked).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-900 text-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
        <h3 className="text-lg font-semibold mb-2">Architectural Integrity Statement</h3>
        <ul className="list-disc list-inside space-y-2 text-indigo-100 text-sm">
          <li><strong>SRS 3.1.4:</strong> Negative inventory states are strictly prevented via database constraints.</li>
          <li><strong>SRS 3.1.1:</strong> Role-Based Access Control (RBAC) includes new 'Inventory Officer' role.</li>
          <li><strong>SRS 3.1.8:</strong> Audit logs are immutable (WORM storage strategy).</li>
          <li><strong>SRS 3.2.1:</strong> Data encryption (AES-256) enabled for sensitive fields.</li>
        </ul>
      </div>
    </div>
  );
};