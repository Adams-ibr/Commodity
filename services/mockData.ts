import { InventoryItem, ProductType, Transaction, TransactionType, UserRole, AuditLogEntry, ComplianceRule } from '../types';

export const mockInventory: InventoryItem[] = [
  {
    id: 'T-001',
    location: 'Lagos Depot - Tank A',
    product: ProductType.PMS,
    currentVolume: 450000,
    maxCapacity: 1000000,
    minThreshold: 100000,
    lastUpdated: '2023-10-26T08:00:00Z',
    status: 'Normal'
  },
  {
    id: 'T-002',
    location: 'Lagos Depot - Tank B',
    product: ProductType.AGO,
    currentVolume: 85000,
    maxCapacity: 500000,
    minThreshold: 50000,
    lastUpdated: '2023-10-26T08:15:00Z',
    status: 'Normal'
  },
  {
    id: 'S-105',
    location: 'Abuja Station 5',
    product: ProductType.PMS,
    currentVolume: 12000,
    maxCapacity: 45000,
    minThreshold: 15000,
    lastUpdated: '2023-10-26T09:30:00Z',
    status: 'Low'
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 'TRX-998',
    type: TransactionType.RECEIPT,
    product: ProductType.PMS,
    volume: 50000,
    source: 'Vessel MT-Ocean',
    destination: 'Lagos Depot - Tank A',
    timestamp: '2023-10-25T14:20:00Z',
    performedBy: 'Ops Manager 1',
    referenceDoc: 'WB-2023-889',
    status: 'APPROVED'
  },
  {
    id: 'TRX-999',
    type: TransactionType.SALE,
    product: ProductType.AGO,
    volume: 5000,
    source: 'Lagos Depot - Tank B',
    destination: 'Customer Truck A',
    timestamp: '2023-10-26T10:00:00Z',
    performedBy: 'Ops Manager 1',
    referenceDoc: 'INV-5541',
    status: 'APPROVED'
  },
  {
    id: 'TRX-1000',
    type: TransactionType.RECEIPT,
    product: ProductType.AGO,
    volume: 10000,
    source: 'Lagos Depot - Tank B',
    destination: '',
    timestamp: '2023-10-26T11:30:00Z',
    performedBy: 'Alex Stock',
    referenceDoc: 'WB-PENDING-01',
    status: 'PENDING'
  }
];

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'AUD-5501',
    timestamp: '2023-10-26T10:00:01Z',
    action: 'TRANSACTION_COMMIT',
    details: 'Sale of 5000L AGO approved. Ref: INV-5541',
    user: 'Ops Manager 1',
    role: UserRole.DEPOT_MANAGER,
    ipHash: 'a1b2c3d4e5'
  },
  {
    id: 'AUD-5500',
    timestamp: '2023-10-26T09:55:00Z',
    action: 'SYSTEM_LOGIN',
    details: 'Successful login',
    user: 'Ops Manager 1',
    role: UserRole.DEPOT_MANAGER,
    ipHash: 'a1b2c3d4e5'
  },
  {
    id: 'AUD-5499',
    timestamp: '2023-10-25T14:21:00Z',
    action: 'INVENTORY_UPDATE',
    details: 'Tank A level increased by 50000L (Receipt)',
    user: 'System',
    role: UserRole.SUPER_ADMIN,
    ipHash: 'system-internal'
  }
];

export const mockCompliance: ComplianceRule[] = [
  {
    id: 'COMP-01',
    category: 'Inventory Accuracy',
    requirement: 'Prevent negative stock levels',
    srsReference: 'SRS 3.1.4',
    status: 'Compliant',
    lastChecked: '2023-10-26T12:00:00Z'
  },
  {
    id: 'COMP-02',
    category: 'Audit Trail',
    requirement: 'Immutable transaction logs',
    srsReference: 'SRS 3.1.8',
    status: 'Compliant',
    lastChecked: '2023-10-26T12:00:00Z'
  },
  {
    id: 'COMP-03',
    category: 'Reporting',
    requirement: 'Daily DPR/NUPRC stock reporting',
    srsReference: 'SRS 3.1.7',
    status: 'Compliant',
    lastChecked: '2023-10-26T08:00:00Z'
  },
  {
    id: 'COMP-04',
    category: 'Security',
    requirement: 'User Authentication & RBAC',
    srsReference: 'SRS 3.1.1',
    status: 'Compliant',
    lastChecked: '2023-10-26T08:00:00Z'
  },
  {
    id: 'COMP-05',
    category: 'Loss Mgmt',
    requirement: 'Justification for Adjustments',
    srsReference: 'SRS 3.1.5',
    status: 'Pending',
    lastChecked: '2023-10-26T08:00:00Z'
  }
];