// =====================================================
// COMMODITY PROCESSING & EXPORT ERP TYPE DEFINITIONS
// =====================================================
// This file contains all TypeScript interfaces and types for the commodity ERP system

// =====================================================
// CORE SYSTEM TYPES
// =====================================================

export interface Company {
  id: string;
  name: string;
  registrationNumber?: string;
  taxId?: string;
  address?: Address;
  contactInfo?: ContactInfo;
  businessSettings?: BusinessSettings;
  baseCurrency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSettings {
  fiscalYearStart: string; // MM-DD format
  defaultWarehouse?: string;
  autoApproveQuality: boolean;
  requireBatchApproval: boolean;
  enableMultiCurrency: boolean;
  defaultExportCurrency: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
}

// Enhanced User Management
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  PROCUREMENT_MANAGER = 'Procurement Manager',
  QUALITY_MANAGER = 'Quality Manager',
  WAREHOUSE_MANAGER = 'Warehouse Manager',
  PRODUCTION_MANAGER = 'Production Manager',
  SALES_MANAGER = 'Sales Manager',
  FINANCE_MANAGER = 'Finance Manager',
  COMPLIANCE_OFFICER = 'Compliance Officer',
  ACCOUNTANT = 'Accountant',
  OPERATOR = 'Operator'
}

export type Permission =
  | 'manage_users'
  | 'manage_suppliers'
  | 'manage_buyers'
  | 'create_purchase_contracts'
  | 'approve_purchase_contracts'
  | 'record_goods_receipt'
  | 'conduct_quality_tests'
  | 'approve_quality'
  | 'reject_quality'
  | 'create_processing_orders'
  | 'manage_inventory'
  | 'transfer_batches'
  | 'create_sales_contracts'
  | 'approve_sales_contracts'
  | 'create_shipments'
  | 'manage_compliance'
  | 'post_journal_entries'
  | 'approve_journal_entries'
  | 'view_financial_reports'
  | 'manage_exchange_rates'
  | 'view_all_transactions'
  | 'delete_transactions'
  | 'manage_documents';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'manage_users', 'manage_suppliers', 'manage_buyers', 'create_purchase_contracts',
    'approve_purchase_contracts', 'record_goods_receipt', 'conduct_quality_tests',
    'approve_quality', 'reject_quality', 'create_processing_orders', 'manage_inventory',
    'transfer_batches', 'create_sales_contracts', 'approve_sales_contracts',
    'create_shipments', 'manage_compliance', 'post_journal_entries',
    'approve_journal_entries', 'view_financial_reports', 'manage_exchange_rates',
    'view_all_transactions', 'delete_transactions', 'manage_documents'
  ],
  [UserRole.ADMIN]: [
    'manage_users', 'manage_suppliers', 'manage_buyers', 'create_purchase_contracts',
    'approve_purchase_contracts', 'record_goods_receipt', 'conduct_quality_tests',
    'approve_quality', 'reject_quality', 'create_processing_orders', 'manage_inventory',
    'transfer_batches', 'create_sales_contracts', 'approve_sales_contracts',
    'create_shipments', 'manage_compliance', 'post_journal_entries',
    'approve_journal_entries', 'view_financial_reports', 'manage_exchange_rates',
    'view_all_transactions', 'manage_documents'
  ],
  [UserRole.PROCUREMENT_MANAGER]: [
    'manage_suppliers', 'create_purchase_contracts', 'approve_purchase_contracts',
    'record_goods_receipt', 'view_all_transactions'
  ],
  [UserRole.QUALITY_MANAGER]: [
    'conduct_quality_tests', 'approve_quality', 'reject_quality', 'manage_documents'
  ],
  [UserRole.WAREHOUSE_MANAGER]: [
    'manage_inventory', 'transfer_batches', 'record_goods_receipt'
  ],
  [UserRole.PRODUCTION_MANAGER]: [
    'create_processing_orders', 'manage_inventory', 'transfer_batches'
  ],
  [UserRole.SALES_MANAGER]: [
    'manage_buyers', 'create_sales_contracts', 'approve_sales_contracts',
    'create_shipments', 'view_all_transactions'
  ],
  [UserRole.FINANCE_MANAGER]: [
    'post_journal_entries', 'approve_journal_entries', 'view_financial_reports',
    'manage_exchange_rates', 'view_all_transactions'
  ],
  [UserRole.COMPLIANCE_OFFICER]: [
    'manage_compliance', 'manage_documents', 'view_all_transactions'
  ],
  [UserRole.ACCOUNTANT]: [
    'post_journal_entries', 'view_financial_reports', 'view_all_transactions'
  ],
  [UserRole.OPERATOR]: [
    'record_goods_receipt', 'conduct_quality_tests', 'transfer_batches'
  ]
};

export interface User {
  id: string;
  companyId?: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  locationId?: string;
  branchId?: string;
  isActive?: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address?: Address;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Location {
  id: string;
  companyId: string;
  branchId?: string;
  name: string;
  code: string;
  type: LocationType;
  address?: Address;
  capacityTons?: number;
  managerId?: string;
  isActive: boolean;
  createdAt: string;
}

export enum LocationType {
  WAREHOUSE = 'WAREHOUSE',
  PROCESSING_PLANT = 'PROCESSING_PLANT',
  PORT = 'PORT',
  FARM = 'FARM'
}

// =====================================================
// COMMODITY MASTER DATA TYPES
// =====================================================

export interface CommodityCategory {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CommodityType {
  id: string;
  companyId: string;
  categoryId: string;
  name: string;
  code: string;
  hsCode?: string;
  exportEligible: boolean;
  qualityParameters: QualityParameter[];
  packagingTypes: PackagingType[];
  standardUnit: string; // 'MT', 'KG', 'TONS'
  isActive: boolean;
  createdAt: string;
}

export interface QualityParameter {
  id: string;
  name: string;
  unit: string;
  minValue?: number;
  maxValue?: number;
  gradeAMax?: number;
  gradeBMax?: number;
  gradeCMax?: number;
  isRequired: boolean;
}

export interface PackagingType {
  id: string;
  name: string;
  weightKg: number;
  description?: string;
}

export interface QualityStandard {
  id: string;
  companyId: string;
  commodityTypeId: string;
  parameterName: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  gradeAMax?: number;
  gradeBMax?: number;
  gradeCMax?: number;
  isRequired: boolean;
  createdAt: string;
}

// =====================================================
// PROCUREMENT TYPES
// =====================================================

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  type: SupplierType;
  registrationNumber?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: Address;
  bankDetails?: BankDetails;
  taxInfo?: TaxInfo;
  performanceRating?: number;
  totalPurchases: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum SupplierType {
  FARMER = 'FARMER',
  AGGREGATOR = 'AGGREGATOR',
  COOPERATIVE = 'COOPERATIVE'
}

export interface BankDetails {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  sortCode?: string;
  swiftCode?: string;
}

export interface TaxInfo {
  taxId?: string;
  vatNumber?: string;
  withholdingTaxRate?: number;
}

export interface PurchaseContract {
  id: string;
  companyId: string;
  contractNumber: string;
  supplierId: string;
  commodityTypeId: string;
  contractDate: string;
  deliveryStartDate?: string;
  deliveryEndDate?: string;
  contractedQuantity: number;
  deliveredQuantity: number;
  pricePerTon?: number; // Kept for backward compatibility, preference is line items
  totalValue?: number;
  totalAmount?: number; // New field for calculated total
  currency: string;
  paymentTerms?: string;
  qualitySpecifications?: Record<string, any>;
  status: ContractStatus;
  items?: PurchaseContractItem[]; // Multi-item support
  createdBy: string;
  createdAt: string;
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  ACTIVE = 'ACTIVE',
  PARTIALLY_FULFILLED = 'PARTIALLY_FULFILLED', // Purchase specific
  FULFILLED = 'FULFILLED', // Purchase specific
  SHIPMENT_IN_PROGRESS = 'SHIPMENT_IN_PROGRESS', // Sales specific
  PARTIALLY_SHIPPED = 'PARTIALLY_SHIPPED', // Sales specific
  FULLY_SHIPPED = 'FULLY_SHIPPED', // Sales specific
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export interface ContractItem {
  id: string;
  contractId: string;
  commodityTypeId: string;
  grade?: string;
  packagingTypeId?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  pricingLogic?: PricingLogic;
  specifications?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseContractItem extends ContractItem {
  deliveredQuantity: number;
}

export interface SalesContractItem extends ContractItem {
  shippedQuantity: number;
}

export interface PricingLogic {
  type: 'FIXED' | 'FORMULA';
  formula?: string;
  basePrice?: number;
  adjustments?: PricingAdjustment[];
}

export interface PricingAdjustment {
  parameter: string;
  threshold: number;
  operator: '>' | '<' | '>=' | '<=';
  impactPerUnit: number; // e.g., -20 per MT
}

// =====================================================
// BATCH TRACKING AND INVENTORY TYPES
// =====================================================

export interface CommodityBatch {
  id: string;
  companyId: string;
  batchNumber: string;
  commodityTypeId: string;
  supplierId: string;
  purchaseContractId?: string;
  locationId: string;
  cropYear?: string;
  receivedDate: string;
  receivedWeight: number;
  currentWeight: number;
  packagingInfo?: PackagingInfo;
  grade?: string;
  status: BatchStatus;
  costPerTon: number;
  totalCost: number;
  currency: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackagingInfo {
  bagCount?: number;
  bagWeight?: number;
  containerType?: string;
  containerCount?: number;
}

export enum BatchStatus {
  RECEIVED = 'RECEIVED',
  TESTED = 'TESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
  SHIPPED = 'SHIPPED'
}

export interface BatchMovement {
  id: string;
  companyId: string;
  batchId: string;
  movementType: MovementType;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  movementDate: string;
  referenceNumber?: string;
  performedBy: string;
  notes?: string;
  createdAt: string;
}

export enum MovementType {
  TRANSFER = 'TRANSFER',
  PROCESSING_IN = 'PROCESSING_IN',
  PROCESSING_OUT = 'PROCESSING_OUT',
  SHIPMENT = 'SHIPMENT'
}

// =====================================================
// QUALITY CONTROL TYPES
// =====================================================

export interface QualityTest {
  id: string;
  companyId: string;
  batchId: string;
  testNumber: string;
  testDate: string;
  moisturePercentage?: number;
  impurityPercentage?: number;
  aflatoxinLevel?: number;
  proteinContent?: number;
  oilContent?: number;
  otherParameters?: Record<string, any>;
  gradeCalculated?: string;
  status: QualityTestStatus;
  testedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  labCertificateUrl?: string;
  createdAt: string;
}

export enum QualityTestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface QualityCertificate {
  id: string;
  companyId: string;
  batchId: string;
  qualityTestId: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string;
  issuedBy: string;
  certificateUrl?: string;
  isValid: boolean;
  createdAt: string;
}

// =====================================================
// PROCESSING AND PRODUCTION TYPES
// =====================================================

export interface ProcessingOrder {
  id: string;
  companyId: string;
  orderNumber: string;
  processingPlantId: string;
  orderDate: string;
  processingDate?: string;
  processingType: ProcessingType;
  status: ProcessingStatus;
  supervisorId: string;
  notes?: string;
  createdAt: string;
}

export enum ProcessingType {
  CLEANING = 'CLEANING',
  SORTING = 'SORTING',
  PACKAGING = 'PACKAGING',
  BLENDING = 'BLENDING'
}

export enum ProcessingStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface ProcessingInput {
  id: string;
  processingOrderId: string;
  batchId: string;
  quantityConsumed: number;
  costAllocated: number;
  createdAt: string;
}

export interface ProcessingOutput {
  id: string;
  processingOrderId: string;
  outputBatchId: string;
  quantityProduced: number;
  yieldPercentage: number;
  grade?: string;
  createdAt: string;
}

// =====================================================
// SALES AND EXPORT TYPES
// =====================================================

export interface Buyer {
  id: string;
  companyId: string;
  name: string;
  type: BuyerType;
  country?: string;
  registrationNumber?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: Address;
  bankDetails?: BankDetails;
  creditLimit?: number;
  paymentTerms?: string;
  preferredCurrency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum BuyerType {
  IMPORTER = 'IMPORTER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  PROCESSOR = 'PROCESSOR'
}

export interface SalesContract {
  id: string;
  companyId: string;
  contractNumber: string;
  buyerId: string;
  commodityTypeId: string;
  contractDate: string;
  shipmentPeriodStart?: string;
  shipmentPeriodEnd?: string;
  contractedQuantity: number;
  shippedQuantity: number;
  pricePerTon?: number;
  totalValue?: number;
  totalAmount?: number;
  currency: string;
  incoterms?: string; // FOB, CIF, etc.
  destinationPort?: string;
  qualitySpecifications?: Record<string, any>;
  status: ContractStatus;
  items?: SalesContractItem[];
  createdBy: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  companyId: string;
  shipmentNumber: string;
  salesContractId: string;
  buyerId: string;
  vesselName?: string;
  containerNumbers?: string[];
  loadingPort?: string;
  destinationPort?: string;
  estimatedDeparture?: string;
  actualDeparture?: string;
  estimatedArrival?: string;
  actualArrival?: string;
  totalQuantity: number;
  totalValue: number;
  currency: string;
  freightCost?: number;
  insuranceCost?: number;
  otherCharges?: number;
  billOfLading?: string;
  status: ShipmentStatus;
  createdBy: string;
  createdAt: string;
}

export enum ShipmentStatus {
  PLANNED = 'PLANNED',
  LOADING = 'LOADING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED'
}

export interface ShipmentBatch {
  id: string;
  shipmentId: string;
  batchId: string;
  allocatedQuantity: number;
  containerNumber?: string;
  createdAt: string;
}

// =====================================================
// FINANCIAL ACCOUNTING TYPES
// =====================================================

export interface Account {
  id: string;
  companyId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountSubtype?: string;
  parentAccountId?: string;
  isActive: boolean;
  createdAt: string;
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE'
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  entryDate: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  createdBy: string;
  postedBy?: string;
  postedAt?: string;
  createdAt: string;
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  lineNumber: number;
  createdAt: string;
}

export interface BusinessTransaction {
  id: string;
  type: BusinessTransactionType;
  referenceId: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  accountingEntries: AccountingEntry[];
}

export enum BusinessTransactionType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  PROCESSING = 'PROCESSING',
  PAYMENT = 'PAYMENT',
  FX_REVALUATION = 'FX_REVALUATION'
}

export interface AccountingEntry {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

// Financial Statements
export interface TrialBalance {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
}

export interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  debitBalance: number;
  creditBalance: number;
}

export interface ProfitLossStatement {
  fromDate: string;
  toDate: string;
  revenue: ProfitLossLine[];
  expenses: ProfitLossLine[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
}

export interface ProfitLossLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface BalanceSheet {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

export interface BalanceSheetSection {
  items: BalanceSheetLine[];
  total: number;
}

export interface BalanceSheetLine {
  accountCode: string;
  accountName: string;
  amount: number;
}

export interface CashFlowStatement {
  fromDate: string;
  toDate: string;
  operatingActivities: CashFlowLine[];
  investingActivities: CashFlowLine[];
  financingActivities: CashFlowLine[];
  netCashFromOperating: number;
  netCashFromInvesting: number;
  netCashFromFinancing: number;
  netCashFlow: number;
}

export interface CashFlowLine {
  description: string;
  amount: number;
}

// =====================================================
// FOREIGN EXCHANGE TYPES
// =====================================================

export interface ExchangeRate {
  id: string;
  companyId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateDate: string;
  source: string; // 'CBN', 'MANUAL', 'API'
  isActive: boolean;
  createdAt: string;
}

export interface MultiCurrencyAmount {
  amount: number;
  currency: string;
  baseAmount?: number;
  baseCurrency?: string;
  exchangeRate?: number;
  rateDate?: string;
}

export interface FXRevaluation {
  id: string;
  companyId: string;
  revaluationDate: string;
  baseCurrency: string;
  accounts: FXRevaluationAccount[];
  totalGainLoss: number;
  createdBy: string;
  createdAt: string;
}

export interface FXRevaluationAccount {
  accountId: string;
  accountName: string;
  currency: string;
  originalAmount: number;
  revaluedAmount: number;
  gainLoss: number;
}

export interface LetterOfCredit {
  id: string;
  companyId: string;
  lcNumber: string;
  salesContractId: string;
  buyerId: string;
  issuingBank: string;
  advisingBank?: string;
  amount: number;
  currency: string;
  issueDate: string;
  expiryDate: string;
  status: LetterOfCreditStatus;
  createdAt: string;
}

export enum LetterOfCreditStatus {
  ACTIVE = 'ACTIVE',
  UTILIZED = 'UTILIZED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

// =====================================================
// COMPLIANCE TYPES
// =====================================================

export interface ExportCompliance {
  id: string;
  companyId: string;
  shipmentId: string;
  nepcRegistration?: string;
  nxpFormNumber?: string;
  phytosanitaryCertificate?: string;
  certificateOfOrigin?: string;
  exportPermit?: string;
  nessFeePaid: boolean;
  nessAmount: number;
  cciNumber?: string;
  vatRate?: number;
  withholdingTaxRate?: number;
  complianceStatus: ComplianceStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export enum ComplianceStatus {
  PENDING = 'PENDING',
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT'
}

export interface ComplianceRule {
  id: string;
  category: string;
  requirement: string;
  description?: string;
  status: 'Compliant' | 'Pending' | 'Flagged';
  lastChecked: string;
}

// =====================================================
// DOCUMENT MANAGEMENT TYPES
// =====================================================

export interface Document {
  id: string;
  companyId: string;
  referenceType: string;
  referenceId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedBy: string;
  isActive: boolean;
  createdAt: string;
}

export enum DocumentType {
  QUALITY_CERTIFICATE = 'QUALITY_CERTIFICATE',
  INVOICE = 'INVOICE',
  BILL_OF_LADING = 'BILL_OF_LADING',
  PACKING_LIST = 'PACKING_LIST',
  CERTIFICATE_OF_ORIGIN = 'CERTIFICATE_OF_ORIGIN',
  PHYTOSANITARY_CERTIFICATE = 'PHYTOSANITARY_CERTIFICATE',
  PURCHASE_CONTRACT = 'PURCHASE_CONTRACT',
  SALES_CONTRACT = 'SALES_CONTRACT',
  LAB_REPORT = 'LAB_REPORT',
  EXPORT_PERMIT = 'EXPORT_PERMIT'
}

// =====================================================
// AUDIT AND SECURITY TYPES
// =====================================================

export interface AuditLogEntry {
  id: string;
  companyId: string;
  tableName: string;
  recordId?: string;
  action: AuditAction;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId: string;
  userRole: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export enum AuditAction {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

// =====================================================
// REPORTING AND ANALYTICS TYPES
// =====================================================

export interface ShipmentProfitability {
  shipmentId: string;
  shipmentNumber: string;
  buyerName: string;
  commodityType: string;
  quantity: number;
  revenue: MultiCurrencyAmount;
  costs: ShipmentCosts;
  profit: MultiCurrencyAmount;
  profitMargin: number;
}

export interface ShipmentCosts {
  procurement: MultiCurrencyAmount;
  processing: MultiCurrencyAmount;
  logistics: MultiCurrencyAmount;
  compliance: MultiCurrencyAmount;
  total: MultiCurrencyAmount;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalContracts: number;
  completedContracts: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
  averagePrice: number;
  totalVolume: number;
}

export interface InventoryValuation {
  commodityTypeId: string;
  commodityName: string;
  totalQuantity: number;
  averageCost: number;
  totalValue: number;
  currency: string;
  lastUpdated: string;
}

export interface StockAging {
  batchId: string;
  batchNumber: string;
  commodityType: string;
  location: string;
  quantity: number;
  ageInDays: number;
  ageCategory: 'Fresh' | '30-60 Days' | '60-90 Days' | '90+ Days';
  value: number;
}

// =====================================================
// VALIDATION AND ERROR HANDLING TYPES
// =====================================================

export interface ValidationRule {
  field: string;
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  customValidator?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

// =====================================================
// BATCH TRACEABILITY TYPES
// =====================================================

export interface BatchTraceability {
  batchId: string;
  traceabilityChain: TraceabilityEvent[];
}

export interface TraceabilityEvent {
  id: string;
  eventType: TraceabilityEventType;
  timestamp: string;
  location: string;
  performedBy: string;
  details: Record<string, any>;
  previousEventId?: string;
}

export enum TraceabilityEventType {
  RECEIVED = 'RECEIVED',
  TESTED = 'TESTED',
  PROCESSED = 'PROCESSED',
  TRANSFERRED = 'TRANSFERRED',
  SHIPPED = 'SHIPPED'
}

// =====================================================
// UTILITY TYPES AND HELPERS
// =====================================================

export type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

export type WeightUnit = 'KG' | 'MT' | 'TONS';

export type Grade = 'A' | 'B' | 'C' | 'REJECT';

// Helper function to check if a role has a specific permission
export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

// Helper function to check if user can manage another role
export const canManageRole = (managerRole: UserRole, targetRole: UserRole): boolean => {
  const roleHierarchy: Record<UserRole, number> = {
    [UserRole.SUPER_ADMIN]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.PROCUREMENT_MANAGER]: 3,
    [UserRole.QUALITY_MANAGER]: 3,
    [UserRole.WAREHOUSE_MANAGER]: 3,
    [UserRole.PRODUCTION_MANAGER]: 3,
    [UserRole.SALES_MANAGER]: 3,
    [UserRole.FINANCE_MANAGER]: 3,
    [UserRole.COMPLIANCE_OFFICER]: 3,
    [UserRole.ACCOUNTANT]: 4,
    [UserRole.OPERATOR]: 5
  };
  return roleHierarchy[managerRole] < roleHierarchy[targetRole];
};

// Helper function to format currency amounts
export const formatCurrency = (amount: number, currency: Currency): string => {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  return formatter.format(amount);
};

// Helper function to format weight
export const formatWeight = (weight: number, unit: WeightUnit): string => {
  return `${weight.toLocaleString()} ${unit}`;
};

// Helper function to calculate age in days
export const calculateAgeInDays = (date: string): number => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = Math.abs(now.getTime() - targetDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to determine stock age category
export const getStockAgeCategory = (ageInDays: number): 'Fresh' | '30-60 Days' | '60-90 Days' | '90+ Days' => {
  if (ageInDays <= 30) return 'Fresh';
  if (ageInDays <= 60) return '30-60 Days';
  if (ageInDays <= 90) return '60-90 Days';
  return '90+ Days';
};

// Helper function to validate batch number format
export const isValidBatchNumber = (batchNumber: string): boolean => {
  // Format: COMMODITY-YYYYMMDD-001
  const pattern = /^[A-Z]{2,10}-\d{8}-\d{3}$/;
  return pattern.test(batchNumber);
};

// Helper function to generate batch number
export const generateBatchNumber = (commodityCode: string, date: Date, sequence: number): string => {
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const seqStr = sequence.toString().padStart(3, '0');
  return `${commodityCode}-${dateStr}-${seqStr}`;
};