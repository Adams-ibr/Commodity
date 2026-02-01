import { ComplianceRule } from '../types';

// Static compliance rules - these are configuration, not seeded mock data
export const COMPLIANCE_RULES: ComplianceRule[] = [
    {
        id: 'COMP-01',
        category: 'Inventory Accuracy',
        requirement: 'Prevent negative stock levels',
        srsReference: 'SRS 3.1.4',
        status: 'Compliant',
        lastChecked: new Date().toISOString()
    },
    {
        id: 'COMP-02',
        category: 'Audit Trail',
        requirement: 'Immutable transaction logs',
        srsReference: 'SRS 3.1.8',
        status: 'Compliant',
        lastChecked: new Date().toISOString()
    },
    {
        id: 'COMP-03',
        category: 'Reporting',
        requirement: 'Daily DPR/NUPRC stock reporting',
        srsReference: 'SRS 3.1.7',
        status: 'Compliant',
        lastChecked: new Date().toISOString()
    },
    {
        id: 'COMP-04',
        category: 'Security',
        requirement: 'User Authentication & RBAC',
        srsReference: 'SRS 3.1.1',
        status: 'Compliant',
        lastChecked: new Date().toISOString()
    },
    {
        id: 'COMP-05',
        category: 'Loss Management',
        requirement: 'Justification for Adjustments',
        srsReference: 'SRS 3.1.5',
        status: 'Pending',
        lastChecked: new Date().toISOString()
    }
];
