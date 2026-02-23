// =====================================================
// PROCUREMENT SERVICE — APPWRITE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import {
  Supplier, SupplierType, PurchaseContract, ContractStatus,
  ValidationResult, ValidationError, ApiResponse, BankDetails, TaxInfo
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
    } catch (error) { return { success: false, error: 'Failed to fetch suppliers' }; }
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
    } catch (error) { return { success: false, error: 'Failed to fetch supplier' }; }
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
    } catch (error) { return { success: false, error: 'Failed to create supplier' }; }
  }

  async updateSupplier(id: string, updates: Partial<Omit<Supplier, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Supplier>> {
    try {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.type) payload.type = updates.type;
      if (updates.contactPerson !== undefined) payload.contact_person = updates.contactPerson;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.address) payload.address = JSON.stringify(updates.address);
      if (updates.bankDetails) payload.bank_details = JSON.stringify(updates.bankDetails);
      if (updates.taxInfo) payload.tax_info = JSON.stringify(updates.taxInfo);
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      const { data, error } = await dbUpdate(COLLECTIONS.SUPPLIERS, id, payload);
      if (error) return { success: false, error };
      return { success: true, data: data as any };
    } catch (error) { return { success: false, error: 'Failed to update supplier' }; }
  }

  async deactivateSupplier(id: string): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await dbUpdate(COLLECTIONS.SUPPLIERS, id, { is_active: false });
      if (error) return { success: false, error };
      return { success: true, data: true };
    } catch (error) { return { success: false, error: 'Failed to deactivate supplier' }; }
  }

  async getPurchaseContracts(companyId: string = DEFAULT_COMPANY_ID, supplierId?: string, status?: ContractStatus): Promise<ApiResponse<PurchaseContract[]>> {
    try {
      const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt')];
      if (supplierId) queries.push(Query.equal('supplier_id', supplierId));
      if (status) queries.push(Query.equal('status', status));
      const { data, error } = await dbList(COLLECTIONS.PURCHASE_CONTRACTS, queries);
      if (error) return { success: false, error };
      const contracts: PurchaseContract[] = (data || []).map((item: any) => ({
        id: item.$id, companyId: item.company_id, contractNumber: item.contract_number,
        supplierId: item.supplier_id, commodityTypeId: item.commodity_type_id,
        contractDate: item.contract_date, deliveryStartDate: item.delivery_start_date, deliveryEndDate: item.delivery_end_date,
        contractedQuantity: Number(item.contracted_quantity), deliveredQuantity: Number(item.delivered_quantity || 0),
        pricePerTon: Number(item.price_per_ton), totalValue: Number(item.total_value), currency: item.currency,
        paymentTerms: item.payment_terms, qualitySpecifications: item.quality_specifications ? JSON.parse(item.quality_specifications) : undefined,
        status: item.status as ContractStatus, createdBy: item.created_by || '', createdAt: item.$createdAt
      }));
      return { success: true, data: contracts };
    } catch (error) { return { success: false, error: 'Failed to fetch purchase contracts' }; }
  }

  async getPurchaseContractById(id: string): Promise<ApiResponse<PurchaseContract>> {
    try {
      const { data, error } = await dbGet(COLLECTIONS.PURCHASE_CONTRACTS, id);
      if (error || !data) return { success: false, error: error || 'Not found' };
      const item = data as any;
      return {
        success: true, data: {
          id: item.$id, companyId: item.company_id, contractNumber: item.contract_number,
          supplierId: item.supplier_id, commodityTypeId: item.commodity_type_id,
          contractDate: item.contract_date, deliveryStartDate: item.delivery_start_date, deliveryEndDate: item.delivery_end_date,
          contractedQuantity: Number(item.contracted_quantity), deliveredQuantity: Number(item.delivered_quantity || 0),
          pricePerTon: Number(item.price_per_ton), totalValue: Number(item.total_value), currency: item.currency,
          paymentTerms: item.payment_terms, qualitySpecifications: item.quality_specifications ? JSON.parse(item.quality_specifications) : undefined,
          status: item.status as ContractStatus, createdBy: item.created_by || '', createdAt: item.$createdAt
        }
      };
    } catch (error) { return { success: false, error: 'Failed to fetch purchase contract' }; }
  }
}