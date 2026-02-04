export enum ProductType {
  PMS = 'PMS (Petrol)',
  AGO = 'AGO (Diesel)',
  DPK = 'DPK (Kerosene)',
  LPG = 'LPG (Gas)' // Retained as common industry requirement, though SRS 1.3 only explicitly lists PMS, AGO, DPK.
}

export enum TransactionType {
  RECEIPT = 'RECEIPT',
  SALE = 'SALE',
  TRANSFER = 'TRANSFER',
  LOSS = 'LOSS'
}

export interface Location {
  id: string;
  name: string;
  type: 'Depot' | 'Station';
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  ACCOUNTANT = 'Accountant',
  CASHIER = 'Cashier'
}

export type Permission =
  | 'manage_users'
  | 'view_all_sales'
  | 'process_sales'
  | 'manage_inventory'
  | 'view_reports'
  | 'approve_transactions';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: ['manage_users', 'view_all_sales', 'process_sales', 'manage_inventory', 'view_reports', 'approve_transactions'],
  [UserRole.ADMIN]: ['manage_users', 'view_all_sales', 'process_sales', 'manage_inventory', 'view_reports', 'approve_transactions'],
  [UserRole.MANAGER]: ['view_all_sales', 'process_sales', 'manage_inventory', 'view_reports', 'approve_transactions'],
  [UserRole.ACCOUNTANT]: ['view_all_sales', 'view_reports'],
  [UserRole.CASHIER]: ['process_sales']
};

// Helper function to check if a role has a specific permission
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

// Helper function to check if user can manage another role
export const canManageRole = (managerRole: UserRole, targetRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.MANAGER]: 3,
    [UserRole.ACCOUNTANT]: 4,
    [UserRole.CASHIER]: 5
  };
  return roleHierarchy[managerRole] < roleHierarchy[targetRole];
};

export interface User {
  name: string;
  role: UserRole;
  location: string;
}

export interface InventoryItem {
  id: string;
  location: string;
  product: ProductType;
  currentVolume: number; // in Liters
  maxCapacity: number;
  minThreshold: number;
  lastUpdated: string;
  status: 'Normal' | 'Low' | 'Critical';
}

export enum CustomerType {
  DEALER = 'Dealer',
  END_USER = 'End User'
}

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  contactInfo?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  status: 'Active' | 'Inactive';
  createdDate: string;
  lastTransactionDate?: string;
  totalPurchases: number;
  averageTransactionSize: number;
  notes?: string;
}

export interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  dealerCount: number;
  endUserCount: number;
  topCustomers: Customer[];
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  product: ProductType;
  volume: number;
  source: string;
  destination: string;
  timestamp: string;
  performedBy: string;
  referenceDoc: string; // Waybill or Ticket ID
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  customerId?: string;
  customerName?: string;
  unitPrice?: number;    // Price per unit at time of sale
  totalAmount?: number;  // Total transaction amount
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
  role: UserRole;
  ipHash: string; // Simulating immutable trace
}

export interface ComplianceRule {
  id: string;
  category: string;
  requirement: string;
  srsReference: string; // Added to link code to SRS sections
  status: 'Compliant' | 'Pending' | 'Flagged';
  lastChecked: string;
}

export interface Price {
  id: string;
  product: ProductType;
  customerType: CustomerType;
  pricePerLiter: number;
  lastUpdated: string;
  updatedBy: string;
}