// =====================================================
// COMMODITY MASTER SERVICE — APPWRITE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { CommodityCategory, CommodityType, ApiResponse, ValidationResult, ValidationError, PackagingType, QualityParameter } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class CommodityMasterService {
  validateCategory(category: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!category.name || category.name.trim() === '') errors.push({ field: 'name', message: 'Category name is required', code: 'REQUIRED_FIELD' });
    return { isValid: errors.length === 0, errors };
  }
  validateCommodityType(commodityType: any): ValidationResult {
    const errors: ValidationError[] = [];
    if (!commodityType.name || commodityType.name.trim() === '') errors.push({ field: 'name', message: 'Commodity name is required', code: 'REQUIRED_FIELD' });
    if (!commodityType.code || commodityType.code.trim() === '') errors.push({ field: 'code', message: 'Commodity code is required', code: 'REQUIRED_FIELD' });
    return { isValid: errors.length === 0, errors };
  }

  async getCategories(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityCategory[]>> {
    try {
      const { data, error } = await dbList(COLLECTIONS.COMMODITY_CATEGORIES, [Query.equal('company_id', companyId), Query.orderAsc('name')]);
      if (error) return { success: false, error };
      const categories: CommodityCategory[] = (data || []).map((c: any) => ({
        id: c.$id, companyId: c.company_id, name: c.name,
        description: c.description, isActive: c.is_active, createdAt: c.$createdAt
      }));
      return { success: true, data: categories };
    } catch (error) { return { success: false, error: 'Failed to fetch categories' }; }
  }

  async createCategory(categoryData: Omit<CommodityCategory, 'id' | 'createdAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityCategory>> {
    try {
      const { data, error } = await dbCreate(COLLECTIONS.COMMODITY_CATEGORIES, {
        company_id: companyId, name: categoryData.name,
        description: categoryData.description || '', is_active: categoryData.isActive !== false
      });
      if (error || !data) return { success: false, error: error || 'Failed' };
      return { success: true, data: { ...categoryData, id: data.$id, createdAt: data.$createdAt } };
    } catch (error) { return { success: false, error: 'Failed to create category' }; }
  }

  async getCommodityTypes(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityType[]>> {
    try {
      const { data, error } = await dbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId), Query.orderAsc('name')]);
      if (error) return { success: false, error };
      const types: CommodityType[] = (data || []).map((t: any) => ({
        id: t.$id, companyId: t.company_id, categoryId: t.category_id,
        name: t.name, code: t.code, hsCode: t.hs_code,
        exportEligible: t.export_eligible !== false,
        qualityParameters: t.quality_parameters ? JSON.parse(t.quality_parameters) : [],
        packagingTypes: t.packaging_types ? JSON.parse(t.packaging_types) : [],
        standardUnit: t.standard_unit || 'MT', isActive: t.is_active, createdAt: t.$createdAt
      }));
      return { success: true, data: types };
    } catch (error) { return { success: false, error: 'Failed to fetch commodity types' }; }
  }

  async createCommodityType(typeData: Omit<CommodityType, 'id' | 'createdAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityType>> {
    try {
      const { data, error } = await dbCreate(COLLECTIONS.COMMODITY_TYPES, {
        company_id: companyId, category_id: typeData.categoryId, name: typeData.name,
        code: typeData.code, hs_code: typeData.hsCode || '',
        export_eligible: typeData.exportEligible !== false,
        quality_parameters: JSON.stringify(typeData.qualityParameters || []),
        packaging_types: JSON.stringify(typeData.packagingTypes || []),
        standard_unit: typeData.standardUnit || 'MT', is_active: typeData.isActive !== false
      });
      if (error || !data) return { success: false, error: error || 'Failed' };
      return { success: true, data: { ...typeData, id: data.$id, createdAt: data.$createdAt } };
    } catch (error) { return { success: false, error: 'Failed to create commodity type' }; }
  }

  async updateCommodityType(id: string, updates: Partial<CommodityType>): Promise<ApiResponse<CommodityType>> {
    try {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.code) payload.code = updates.code;
      if (updates.hsCode !== undefined) payload.hs_code = updates.hsCode;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;
      if (updates.qualityParameters) payload.quality_parameters = JSON.stringify(updates.qualityParameters);
      if (updates.packagingTypes) payload.packaging_types = JSON.stringify(updates.packagingTypes);
      if (updates.standardUnit) payload.standard_unit = updates.standardUnit;
      const { data, error } = await dbUpdate(COLLECTIONS.COMMODITY_TYPES, id, payload);
      if (error) return { success: false, error };
      return { success: true, data: data as any };
    } catch (error) { return { success: false, error: 'Failed to update commodity type' }; }
  }

  async toggleCommodityTypeStatus(id: string, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      const { error } = await dbUpdate(COLLECTIONS.COMMODITY_TYPES, id, { is_active: isActive });
      if (error) return { success: false, error };
      return { success: true, data: true };
    } catch (error) { return { success: false, error: 'Failed to toggle status' }; }
  }
}
