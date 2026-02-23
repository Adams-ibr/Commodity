// =====================================================
// COMMODITY MASTER UTILS — APPWRITE
// =====================================================
import { dbList, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { CommodityCategory, CommodityType, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export async function getCategoriesWithTypes(
  companyId: string = DEFAULT_COMPANY_ID
): Promise<ApiResponse<{ categories: CommodityCategory[]; types: CommodityType[] }>> {
  try {
    const [catRes, typeRes] = await Promise.all([
      dbList(COLLECTIONS.COMMODITY_CATEGORIES, [Query.equal('company_id', companyId), Query.orderAsc('name')]),
      dbList(COLLECTIONS.COMMODITY_TYPES, [Query.equal('company_id', companyId), Query.orderAsc('name')])
    ]);

    const categories: CommodityCategory[] = (catRes.data || []).map((c: any) => ({
      id: c.$id, companyId: c.company_id, name: c.name,
      description: c.description, isActive: c.is_active, createdAt: c.$createdAt
    }));

    const types: CommodityType[] = (typeRes.data || []).map((t: any) => ({
      id: t.$id, companyId: t.company_id, categoryId: t.category_id,
      name: t.name, code: t.code, hsCode: t.hs_code,
      exportEligible: t.export_eligible !== false,
      qualityParameters: t.quality_parameters ? JSON.parse(t.quality_parameters) : [],
      packagingTypes: t.packaging_types ? JSON.parse(t.packaging_types) : [],
      standardUnit: t.standard_unit || 'MT', isActive: t.is_active,
      createdAt: t.$createdAt
    }));

    return { success: true, data: { categories, types } };
  } catch (error) {
    return { success: false, error: 'Failed to fetch categories and types' };
  }
}