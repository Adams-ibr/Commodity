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

export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  DEPOT_MANAGER = 'Depot Manager',
  STATION_MANAGER = 'Station Manager',
  INVENTORY_OFFICER = 'Inventory Officer', // Added per SRS 2.3
  AUDITOR = 'Auditor'
}

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
  contactInfo?: string;
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