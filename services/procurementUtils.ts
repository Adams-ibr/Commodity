// =====================================================
// PROCUREMENT UTILS — APPWRITE
// =====================================================
import { dbList, dbCreate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { PurchaseContract, ContractStatus, CommodityBatch, BatchStatus, ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export async function getOutstandingContracts(
  companyId: string = DEFAULT_COMPANY_ID
): Promise<ApiResponse<PurchaseContract[]>> {
  try {
    const { data, error } = await dbList(COLLECTIONS.PURCHASE_CONTRACTS, [
      Query.equal('company_id', companyId),
      Query.equal('status', 'ACTIVE'),
      Query.orderDesc('$createdAt')
    ]);
    if (error) return { success: false, error };
    const activeContracts = (data || []).filter(
      (item: any) => Number(item.delivered_quantity) < Number(item.contracted_quantity)
    );
    const contracts: PurchaseContract[] = activeContracts.map((item: any) => ({
      id: item.$id, companyId: item.company_id, contractNumber: item.contract_number,
      supplierId: item.supplier_id, commodityTypeId: item.commodity_type_id,
      contractDate: item.contract_date,
      deliveryStartDate: item.delivery_start_date,
      deliveryEndDate: item.delivery_end_date,
      contractedQuantity: Number(item.contracted_quantity),
      deliveredQuantity: Number(item.delivered_quantity || 0),
      pricePerTon: Number(item.price_per_ton),
      totalValue: Number(item.total_value), currency: item.currency,
      paymentTerms: item.payment_terms,
      qualitySpecifications: item.quality_specifications ? JSON.parse(item.quality_specifications) : undefined,
      status: item.status as ContractStatus,
      createdBy: item.created_by || '', createdAt: item.$createdAt
    }));
    return { success: true, data: contracts };
  } catch (error) {
    return { success: false, error: 'Failed to fetch outstanding contracts' };
  }
}

export async function receiveGoods(
  contractId: string,
  batchData: {
    batchNumber: string; commodityTypeId: string; supplierId: string;
    locationId: string; cropYear: string; receivedWeight: number;
    grade: string; costPerTon: number; notes?: string; createdBy?: string;
  },
  companyId: string = DEFAULT_COMPANY_ID
): Promise<ApiResponse<CommodityBatch>> {
  try {
    const totalCost = batchData.receivedWeight * batchData.costPerTon;
    const { data, error } = await dbCreate(COLLECTIONS.COMMODITY_BATCHES, {
      company_id: companyId, batch_number: batchData.batchNumber,
      commodity_type_id: batchData.commodityTypeId, supplier_id: batchData.supplierId,
      purchase_contract_id: contractId, location_id: batchData.locationId,
      crop_year: batchData.cropYear, received_date: new Date().toISOString(),
      received_weight: batchData.receivedWeight, current_weight: batchData.receivedWeight,
      grade: batchData.grade, status: BatchStatus.RECEIVED,
      cost_per_ton: batchData.costPerTon, total_cost: totalCost,
      currency: 'NGN', notes: batchData.notes || '',
      created_by: batchData.createdBy || ''
    });
    if (error || !data) return { success: false, error: error || 'Failed to create batch' };
    return {
      success: true, data: {
        id: data.$id, companyId: data.company_id, batchNumber: data.batch_number,
        commodityTypeId: data.commodity_type_id, supplierId: data.supplier_id,
        purchaseContractId: data.purchase_contract_id, locationId: data.location_id,
        cropYear: data.crop_year, receivedDate: data.received_date,
        receivedWeight: data.received_weight, currentWeight: data.current_weight,
        grade: data.grade, status: data.status,
        costPerTon: data.cost_per_ton, totalCost: data.total_cost,
        currency: data.currency, notes: data.notes,
        createdBy: data.created_by || '',
        createdAt: data.$createdAt, updatedAt: data.$updatedAt
      }
    };
  } catch (error) {
    return { success: false, error: 'Failed to receive goods' };
  }
}