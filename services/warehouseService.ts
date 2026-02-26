// =====================================================
// WAREHOUSE SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { CommodityBatch, BatchStatus, BatchMovement, MovementType, ApiResponse, Location } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class WarehouseService {
    async getInventory(
        params: { companyId?: string; page?: number; limit?: number } = {}
    ): Promise<ApiResponse<{ data: CommodityBatch[]; total: number }>> {
        const { companyId = DEFAULT_COMPANY_ID, page = 1, limit = 100 } = params;
        const offset = (page - 1) * limit;
        try {
            const { data, total, error } = await dbList(COLLECTIONS.COMMODITY_BATCHES, [
                Query.equal('company_id', companyId),
                Query.orderDesc('received_date'),
                Query.limit(limit),
                Query.offset(offset)
            ]);
            if (error) return { success: false, error };

            const batches: CommodityBatch[] = (data || [])
                .filter((item: any) => Number(item.current_weight || 0) > 0)
                .map((item: any) => ({
                    id: item.$id, companyId: item.company_id, batchNumber: item.batch_number,
                    commodityTypeId: item.commodity_type_id, supplierId: item.supplier_id,
                    purchaseContractId: item.purchase_contract_id,
                    purchaseContractItemId: item.purchase_contract_item_id,
                    locationId: item.location_id,
                    cropYear: item.crop_year, receivedDate: item.received_date,
                    receivedWeight: Number(item.received_weight || 0),
                    currentWeight: Number(item.current_weight || 0),
                    packagingInfo: item.packaging_info, grade: item.grade, status: item.status,
                    costPerTon: Number(item.cost_per_ton || 0),
                    totalCost: Number(item.total_cost || 0),
                    currency: item.currency, notes: item.notes, createdBy: item.created_by,
                    createdAt: item.$createdAt, updatedAt: item.$updatedAt
                }));
            return { success: true, data: { data: batches, total: total || 0 } };
        } catch (error) {
            return { success: false, error: 'Failed to fetch inventory' };
        }
    }

    async recordMovement(
        movement: Omit<BatchMovement, 'id' | 'createdAt'>,
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<BatchMovement>> {
        try {
            const { data: sourceBatch } = await dbGet(COLLECTIONS.COMMODITY_BATCHES, movement.batchId);
            if (!sourceBatch) return { success: false, error: 'Source batch not found' };
            if ((sourceBatch as any).current_weight < movement.quantity) {
                return { success: false, error: 'Insufficient quantity in source batch' };
            }
            const { data, error } = await dbCreate(COLLECTIONS.BATCH_MOVEMENTS, {
                company_id: companyId, batch_id: movement.batchId,
                movement_type: movement.movementType, from_location_id: movement.fromLocationId,
                to_location_id: movement.toLocationId, quantity: movement.quantity,
                movement_date: movement.movementDate, reference_number: movement.referenceNumber,
                performed_by: movement.performedBy, notes: movement.notes
            });
            if (error || !data) return { success: false, error: error || 'Failed to create movement' };
            return {
                success: true, data: {
                    id: data.$id, companyId: data.company_id, batchId: data.batch_id,
                    movementType: data.movement_type, fromLocationId: data.from_location_id,
                    toLocationId: data.to_location_id, quantity: data.quantity,
                    movementDate: data.movement_date, referenceNumber: data.reference_number,
                    performedBy: data.performed_by, notes: data.notes, createdAt: data.$createdAt
                }
            };
        } catch (error) {
            return { success: false, error: 'Failed to record movement' };
        }
    }

    async getBatchMovements(batchId: string, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<BatchMovement[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.BATCH_MOVEMENTS, [
                Query.equal('batch_id', batchId),
                Query.equal('company_id', companyId),
                Query.orderDesc('movement_date')
            ]);
            if (error) return { success: false, error };
            const movements: BatchMovement[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, batchId: item.batch_id,
                movementType: item.movement_type, fromLocationId: item.from_location_id,
                toLocationId: item.to_location_id, quantity: item.quantity,
                movementDate: item.movement_date, referenceNumber: item.reference_number,
                performedBy: item.performed_by, notes: item.notes, createdAt: item.$createdAt
            }));
            return { success: true, data: movements };
        } catch (error) {
            return { success: false, error: 'Failed to fetch movements' };
        }
    }

    async createGoodsReceipt(
        receiptData: {
            purchaseContractId: string;
            purchaseContractItemId: string;
            locationId: string;
            receivedWeight: number;
            receivedDate: string;
            grade: string;
            packagingInfo: any;
            notes?: string;
            createdBy?: string;
        },
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<CommodityBatch>> {
        try {
            const { data: contract } = await dbGet(COLLECTIONS.PURCHASE_CONTRACTS, receiptData.purchaseContractId);
            if (!contract || contract.status !== 'ACTIVE') {
                return { success: false, error: 'Cannot receive goods for a contract that is not ACTIVE' };
            }

            const batchNumber = `BAT-${Date.now().toString().slice(-8)}`;
            const { data, error } = await dbCreate(COLLECTIONS.COMMODITY_BATCHES, {
                company_id: companyId,
                batch_number: batchNumber,
                commodity_type_id: contract.commodity_type_id,
                supplier_id: contract.supplier_id,
                purchase_contract_id: receiptData.purchaseContractId,
                purchase_contract_item_id: receiptData.purchaseContractItemId,
                location_id: receiptData.locationId,
                received_date: receiptData.receivedDate,
                received_weight: receiptData.receivedWeight,
                current_weight: receiptData.receivedWeight,
                packaging_info: JSON.stringify(receiptData.packagingInfo),
                grade: receiptData.grade,
                status: 'RECEIVED' as BatchStatus,
                cost_per_ton: (contract as any).price_per_ton || 0,
                total_cost: ((contract as any).price_per_ton || 0) * receiptData.receivedWeight,
                currency: contract.currency,
                notes: receiptData.notes || '',
                created_by: receiptData.createdBy || 'system'
            });

            if (error || !data) return { success: false, error: error || 'Failed' };

            await dbUpdate(COLLECTIONS.PURCHASE_CONTRACT_ITEMS, receiptData.purchaseContractItemId, {
                delivered_quantity: (Number((data as any).delivered_quantity || 0) + receiptData.receivedWeight)
            });

            return { success: true, data: data as any };
        } catch (error) {
            return { success: false, error: 'Failed' };
        }
    }
}
