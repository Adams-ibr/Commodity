// =====================================================
// PROCUREMENT SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import {
  Supplier, SupplierType, PurchaseContract, ContractStatus,
  ValidationResult, ValidationError, ApiResponse, BankDetails, TaxInfo,
  PurchaseContractItem
} from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class ProcurementService {
  validateSupplier(supplier: Partial<Supplier>): ValidationResult {
    const errors: ValidationError[] = [];
    if (!supplier.name || supplier.name.trim() === '') errors.push({ field: 'name', message: 'Supplier name is required', code: 'REQUIRED_FIELD' });
    if (!supplier.type) errors.push({ field: 'type', message: 'Supplier type is required', code: 'REQUIRED_FIELD' });
    return { isValid: errors.length === 0, errors };
  }

  async getSuppliers(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<Supplier[]>> {
    try {
      const { data, error } = await dbList(COLLECTIONS.SUPPLIERS, [Query.equal('company_id', companyId), Query.orderDesc('$createdAt')]);
      if (error) return { success: false, error };
      const suppliers: Supplier[] = (data || []).map((item: any) => ({
        id: item.$id, companyId: item.company_id, name: item.name,
        type: item.type as SupplierType, registrationNumber: item.registration_number,
        contactPerson: item.contact_person, email: item.email, phone: item.phone,
        address: item.address ? JSON.parse(item.address) : undefined,
        bankDetails: item.bank_details ? JSON.parse(item.bank_details) : undefined,
        taxInfo: item.tax_info ? JSON.parse(item.tax_info) : undefined,
        performanceRating: item.performance_rating,
        totalPurchases: item.total_purchases || 0, isActive: item.is_active,
        createdAt: item.$createdAt, updatedAt: item.$updatedAt,
      }));
      return { success: true, data: suppliers };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async getSupplierById(id: string): Promise<ApiResponse<Supplier>> {
    try {
      const { data, error } = await dbGet(COLLECTIONS.SUPPLIERS, id);
      if (error || !data) return { success: false, error: error || 'Not found' };
      const item = data as any;
      return {
        success: true, data: {
          id: item.$id, companyId: item.company_id, name: item.name,
          type: item.type as SupplierType, registrationNumber: item.registration_number,
          contactPerson: item.contact_person, email: item.email, phone: item.phone,
          address: item.address ? JSON.parse(item.address) : undefined,
          bankDetails: item.bank_details ? JSON.parse(item.bank_details) : undefined,
          taxInfo: item.tax_info ? JSON.parse(item.tax_info) : undefined,
          performanceRating: item.performance_rating,
          totalPurchases: item.total_purchases || 0, isActive: item.is_active,
          createdAt: item.$createdAt, updatedAt: item.$updatedAt,
        }
      };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async updateSupplier(id: string, supplier: Partial<Supplier>): Promise<ApiResponse<Supplier>> {
    try {
      const payload: any = {};
      if (supplier.name !== undefined) payload.name = supplier.name;
      if (supplier.type !== undefined) payload.type = supplier.type;
      if (supplier.registrationNumber !== undefined) payload.registration_number = supplier.registrationNumber;
      if (supplier.contactPerson !== undefined) payload.contact_person = supplier.contactPerson;
      if (supplier.email !== undefined) payload.email = supplier.email;
      if (supplier.phone !== undefined) payload.phone = supplier.phone;
      if (supplier.address !== undefined) payload.address = typeof supplier.address === 'string' ? supplier.address : JSON.stringify(supplier.address);
      if (supplier.bankDetails !== undefined) payload.bank_details = typeof supplier.bankDetails === 'string' ? supplier.bankDetails : JSON.stringify(supplier.bankDetails);
      if (supplier.taxInfo !== undefined) payload.tax_info = typeof supplier.taxInfo === 'string' ? supplier.taxInfo : JSON.stringify(supplier.taxInfo);
      if (supplier.performanceRating !== undefined) payload.performance_rating = supplier.performanceRating;
      if (supplier.isActive !== undefined) payload.is_active = supplier.isActive;

      const { data, error } = await dbUpdate(COLLECTIONS.SUPPLIERS, id, payload);
      if (error || !data) return { success: false, error: error || 'Failed' };
      const item = data as any;
      return {
        success: true, data: {
          id: item.$id, companyId: item.company_id, name: item.name,
          type: item.type as SupplierType, registrationNumber: item.registration_number,
          contactPerson: item.contact_person, email: item.email, phone: item.phone,
          address: item.address ? JSON.parse(item.address) : undefined,
          bankDetails: item.bank_details ? JSON.parse(item.bank_details) : undefined,
          taxInfo: item.tax_info ? JSON.parse(item.tax_info) : undefined,
          performanceRating: item.performance_rating,
          totalPurchases: item.total_purchases || 0, isActive: item.is_active,
          createdAt: item.$createdAt, updatedAt: item.$updatedAt,
        }
      };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async deactivateSupplier(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await dbUpdate(COLLECTIONS.SUPPLIERS, id, { is_active: false });
      if (error) return { success: false, error };
      return { success: true };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async createSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<Supplier>> {
    try {
      const { data, error } = await dbCreate(COLLECTIONS.SUPPLIERS, {
        company_id: companyId, name: supplier.name, type: supplier.type,
        registration_number: supplier.registrationNumber || '',
        contact_person: supplier.contactPerson || '', email: supplier.email || '', phone: supplier.phone || '',
        address: supplier.address ? JSON.stringify(supplier.address) : '',
        bank_details: supplier.bankDetails ? JSON.stringify(supplier.bankDetails) : '',
        tax_info: supplier.taxInfo ? JSON.stringify(supplier.taxInfo) : '',
        performance_rating: supplier.performanceRating || 0,
        total_purchases: supplier.totalPurchases || 0,
        is_active: supplier.isActive !== undefined ? supplier.isActive : true,
      });
      if (error || !data) return { success: false, error: error || 'Failed' };
      return { success: true, data: { ...supplier, id: data.$id, createdAt: data.$createdAt, updatedAt: data.$updatedAt } };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async getPurchaseContracts(
    params: { companyId?: string; supplierId?: string; status?: ContractStatus; page?: number; limit?: number; includeItems?: boolean } = {}
  ): Promise<ApiResponse<{ data: PurchaseContract[]; total: number }>> {
    const { companyId = DEFAULT_COMPANY_ID, supplierId, status, page = 1, limit = 100, includeItems = true } = params;
    const offset = (page - 1) * limit;
    try {
      const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset)];
      if (supplierId) queries.push(Query.equal('supplier_id', supplierId));
      if (status) queries.push(Query.equal('status', status));

      const { data, total, error } = await dbList(COLLECTIONS.PURCHASE_CONTRACTS, queries);
      if (error) return { success: false, error };

      const contracts: PurchaseContract[] = (data || []).map((item: any) => ({
        id: item.$id, companyId: item.company_id, contractNumber: item.contract_number,
        supplierId: item.supplier_id, commodityTypeId: item.commodity_type_id,
        contractDate: item.contract_date, deliveryStartDate: item.delivery_start_date, deliveryEndDate: item.delivery_end_date,
        contractedQuantity: Number(item.contracted_quantity), deliveredQuantity: Number(item.delivered_quantity || 0),
        pricePerTon: item.price_per_ton ? Number(item.price_per_ton) : undefined,
        totalValue: item.total_value ? Number(item.total_value) : undefined,
        totalAmount: item.total_amount ? Number(item.total_amount) : undefined,
        currency: item.currency, paymentTerms: item.payment_terms,
        qualitySpecifications: item.quality_specifications ? JSON.parse(item.quality_specifications) : undefined,
        status: item.status as ContractStatus, createdBy: item.created_by || '', createdAt: item.$createdAt
      }));

      if (includeItems && contracts.length > 0) {
        const { data: itemsData } = await dbList(COLLECTIONS.PURCHASE_CONTRACT_ITEMS, [
          Query.equal('contract_id', contracts.map(c => c.id))
        ]);
        if (itemsData) {
          contracts.forEach(c => {
            c.items = itemsData.filter((i: any) => i.contract_id === c.id).map((i: any) => ({
              id: i.$id, contractId: i.contract_id, commodityTypeId: i.commodity_type_id,
              grade: i.grade, packagingTypeId: i.packaging_type_id,
              quantity: Number(i.quantity), deliveredQuantity: Number(i.delivered_quantity || 0),
              unitPrice: Number(i.unit_price), currency: i.currency,
              pricingLogic: i.pricing_logic ? JSON.parse(i.pricing_logic) : undefined,
              specifications: i.specifications ? JSON.parse(i.specifications) : undefined,
              createdAt: i.$createdAt, updatedAt: i.$updatedAt
            }));
          });
        }
      }

      return { success: true, data: { data: contracts, total: total || 0 } };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }

  async createPurchaseContract(
    contractData: Omit<PurchaseContract, 'id' | 'createdAt' | 'status' | 'deliveredQuantity' | 'totalValue'>,
    companyId: string = DEFAULT_COMPANY_ID
  ): Promise<ApiResponse<PurchaseContract>> {
    try {
      let totalAmount = 0;
      if (contractData.items && contractData.items.length > 0) {
        totalAmount = contractData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      } else if (contractData.contractedQuantity && contractData.pricePerTon) {
        totalAmount = Number(contractData.contractedQuantity) * Number(contractData.pricePerTon);
      }

      const { data, error } = await dbCreate(COLLECTIONS.PURCHASE_CONTRACTS, {
        company_id: companyId, contract_number: contractData.contractNumber,
        supplier_id: contractData.supplierId, commodity_type_id: contractData.commodityTypeId,
        contract_date: contractData.contractDate,
        delivery_start_date: contractData.deliveryStartDate || null,
        delivery_end_date: contractData.deliveryEndDate || null,
        contracted_quantity: contractData.contractedQuantity, delivered_quantity: 0,
        price_per_ton: contractData.pricePerTon || 0, total_value: totalAmount,
        total_amount: totalAmount,
        currency: contractData.currency, payment_terms: contractData.paymentTerms || '',
        quality_specifications: contractData.qualitySpecifications ? JSON.stringify(contractData.qualitySpecifications) : '',
        status: 'DRAFT', created_by: contractData.createdBy || ''
      });
      if (error || !data) return { success: false, error: error || 'Failed' };

      const contractId = data.$id;
      const createdItems: PurchaseContractItem[] = [];
      if (contractData.items && contractData.items.length > 0) {
        for (const item of contractData.items) {
          const { data: itemData } = await dbCreate(COLLECTIONS.PURCHASE_CONTRACT_ITEMS, {
            contract_id: contractId,
            commodity_type_id: item.commodityTypeId,
            grade: item.grade || '',
            packaging_type_id: item.packagingTypeId || null,
            quantity: item.quantity,
            delivered_quantity: 0,
            unit_price: item.unitPrice,
            currency: item.currency || contractData.currency,
            pricing_logic: item.pricingLogic ? JSON.stringify(item.pricingLogic) : null,
            specifications: item.specifications ? JSON.stringify(item.specifications) : null
          });
          if (itemData) {
            createdItems.push({
              ...item,
              id: itemData.$id,
              contractId,
              deliveredQuantity: 0,
              createdAt: itemData.$createdAt,
              updatedAt: itemData.$updatedAt
            });
          }
        }
      }

      return {
        success: true,
        data: {
          ...contractData,
          id: contractId,
          status: 'DRAFT' as ContractStatus,
          deliveredQuantity: 0,
          totalValue: totalAmount,
          totalAmount,
          items: createdItems,
          createdAt: data.$createdAt
        }
      };
    } catch (error) { return { success: false, error: 'Failed' }; }
  }
}