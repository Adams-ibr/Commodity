# Implementation Plan

- [x] 1. Database Schema Transformation
  - Create new PostgreSQL schema for commodity ERP system
  - Implement company/tenant support tables with proper relationships
  - Create commodity master data tables (categories, types, quality parameters)
  - Implement batch tracking tables with full traceability support
  - Create financial accounting tables (chart of accounts, journal entries)
  - Add proper indexes and constraints for performance and data integrity
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 2.2, 8.1, 8.2_

- [x] 2. Core Type System Transformation
  - Replace petroleum-focused types with commodity-specific interfaces
  - Implement CommodityCategory, CommodityType, and CommodityBatch interfaces
  - Create quality control types (QualityTest, QualityParameter, QualityCertificate)
  - Implement financial types (Account, JournalEntry, BusinessTransaction)
  - Add batch traceability and multi-currency support types
  - Create comprehensive validation interfaces and error handling types
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 8.1, 8.2, 9.1_

- [x] 3. Commodity Master Data Service
  - Implement CommodityMasterService with category and type management
  - Create commodity category CRUD operations with validation
  - Implement commodity type management with quality parameter definitions
  - Add HS code management and export eligibility tracking
  - Create packaging type and crop year tracking functionality
  - Implement activation/deactivation workflow for commodities
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Supplier and Procurement Service
  - Transform customer management to supplier management for procurement
  - Implement supplier profile management (farmers, aggregators)
  - Create supplier performance tracking and transaction history
  - Implement purchase contract management with pricing per metric ton
  - Add partial delivery tracking and outstanding quantity management
  - Create goods receipt functionality with automatic batch number generation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Quality Control Management System
  - Implement QualityControlService for batch testing and approval
  - Create quality test recording (moisture, impurity, aflatoxin levels)
  - Implement automatic grade classification based on thresholds
  - Add approval/rejection workflow with proper authorization
  - Create quality certificate generation functionality
  - Implement lab document upload and quality history tracking
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Processing and Production Module
  - Implement ProcessingService for production order management
  - Create raw material consumption tracking from batches
  - Implement processed output generation with new batch creation
  - Add yield calculation and production loss tracking
  - Create by-product management and rebagging operations
  - Implement processing cost allocation and operator tracking
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Warehouse and Inventory Transformation
  - Transform volume-based inventory to weight-based batch inventory
  - Implement batch-level inventory tracking in kg/tons and secondary units
  - Create FIFO inventory valuation system for accurate costing
  - Implement warehouse transfer functionality between locations
  - Add stock aging, shrinkage, and fumigation event tracking
  - Create negative stock prevention and inventory integrity checks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8. Sales and Export Management System
  - Transform customer management to buyer management for exports
  - Implement buyer profile management with multi-currency support
  - Create sales contract management with export pricing
  - Implement shipment management with batch allocation
  - Add container tracking, shipping line, and logistics cost management
  - Create export documentation (Bill of Lading, shipping documents)
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Invoicing and Documentation System
  - Implement multi-currency invoice generation (proforma, commercial)
  - Create packing list generation with batch details
  - Add exchange rate capture and currency conversion
  - Implement document template system for various export documents
  - Create invoice numbering and reference tracking
  - Add PDF generation for all export documentation
  - _Requirements: 7.5, 9.1, 9.2, 12.1, 12.2_

- [x] 10. Double-Entry Accounting Foundation
  - Implement chart of accounts setup and management
  - Create double-entry journal entry posting system
  - Add automatic transaction posting for business events
  - Implement accounts payable and receivable management
  - Create bank reconciliation functionality
  - Add manual journal entry support with proper authorization
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11. Financial Statements and Reporting
  - Implement trial balance generation with real-time data
  - Create profit and loss statement generation
  - Add balance sheet generation with proper classifications
  - Implement cash flow statement generation
  - Create financial period management and closing procedures
  - Add financial report export functionality (PDF, Excel)
  - _Requirements: 8.5, 11.1, 11.4_

- [x] 12. Foreign Exchange Management
  - Implement exchange rate table management with daily updates
  - Create FX revaluation calculation for foreign currency balances
  - Add FX gain/loss tracking and reporting
  - Implement multi-currency transaction support
  - Create FX exposure reporting for risk management
  - Add currency conversion utilities throughout the system
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 13. Trade Finance Integration
  - Implement letter of credit tracking and management
  - Create advance payment tracking for suppliers and buyers
  - Add trade finance document management
  - Implement shipment profitability calculation in base currency
  - Create trade finance reporting and analytics
  - Add integration points for banking and finance partners
  - _Requirements: 9.2, 9.4, 11.1_

- [x] 14. Nigerian Compliance Management
  - Implement VAT rate configuration and calculation
  - Create withholding tax tracking and reporting
  - Add NEPC registration data management
  - Implement NXP form reference tracking
  - Create phytosanitary and certificate of origin management
  - Generate Nigerian export compliance reports
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 15. Advanced Reporting and Analytics
  - Implement profit analysis per shipment, commodity, and buyer
  - Create warehouse stock reports with aging analysis
  - Add processing yield reports and efficiency metrics
  - Implement supplier performance reporting and scorecards
  - Create cost per container analysis and operational metrics
  - Add dashboard widgets for key performance indicators
  - _Requirements: 11.1, 11.2, 11.3, 11.5_

- [x] 16. Document Management System
  - Implement secure document upload per transaction
  - Create document versioning and change tracking
  - Add role-based document access control
  - Implement document categorization by transaction type
  - Create document search and retrieval functionality
  - Add document retention policies and archival
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 17. Audit Trail and Security Enhancement
  - Enhance audit logging for all financial transactions
  - Implement comprehensive change history tracking
  - Add login history and session management
  - Create password policy enforcement and security controls
  - Implement transaction deletion prevention for posted entries
  - Add data encryption at rest and in transit validation
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 18. User Interface Transformation
  - Transform petroleum-focused UI components to commodity interfaces
  - Create commodity master data management screens
  - Implement procurement and supplier management interfaces
  - Add quality control testing and approval screens
  - Create processing and production management interfaces
  - Implement warehouse and batch inventory management UI
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 19. Sales and Export UI Components
  - Create buyer management and sales contract interfaces
  - Implement shipment management and batch allocation screens
  - Add export documentation and invoice generation UI
  - Create logistics and container tracking interfaces
  - Implement compliance checklist and validation screens
  - Add export workflow management and approval processes
  - _Requirements: 7.1, 7.2, 7.3, 10.1, 10.4_

- [ ] 20. Financial Management Interface
  - Create chart of accounts management interface
  - Implement journal entry creation and approval screens
  - Add accounts payable and receivable management UI
  - Create financial statements generation and viewing interface
  - Implement foreign exchange management screens
  - Add financial reporting dashboard and analytics
  - _Requirements: 8.1, 8.2, 8.5, 9.1, 11.1_

- [ ] 21. Integration Testing and Data Migration
  - Create comprehensive integration tests for end-to-end workflows
  - Implement data migration utilities from petroleum to commodity data
  - Add data validation and integrity checking tools
  - Create performance testing for batch operations and reporting
  - Implement rollback procedures for failed migrations
  - Add system health monitoring and alerting
  - _Requirements: 1.5, 6.5, 8.1, 13.1_

- [ ] 22. Multi-Tenant Architecture Preparation
  - Add company_id fields to all relevant tables and queries
  - Implement tenant isolation and data security
  - Create tenant onboarding and configuration workflows
  - Add subscription management foundation
  - Implement plan-based feature toggles
  - Create usage tracking and limits framework
  - _Requirements: 1.4, 13.5_

- [ ] 23. Performance Optimization and Caching
  - Optimize database queries for batch operations and reporting
  - Implement caching strategies for frequently accessed data
  - Add pagination for large data sets (batches, transactions)
  - Create database indexing strategy for performance
  - Implement lazy loading for complex data relationships
  - Add query performance monitoring and optimization
  - _Requirements: 6.1, 11.1, 11.2_

- [ ] 24. Final System Integration and Testing
  - Conduct end-to-end testing of complete commodity workflows
  - Perform load testing for concurrent user scenarios
  - Validate financial integrity and double-entry balance verification
  - Test export compliance workflows and documentation generation
  - Verify batch traceability throughout the entire supply chain
  - Conduct security testing and vulnerability assessment
  - _Requirements: 8.1, 10.5, 13.1, 13.5_