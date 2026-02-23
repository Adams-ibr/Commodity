// =====================================================
// WAREHOUSE SERVICE — APPWRITE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { CommodityBatch, BatchStatus, BatchMovement, MovementType, ApiResponse, Location } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class WarehouseService {
    async getInventory(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<CommodityBatch[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.COMMODITY_BATCHES, [
                Query.equal('company_id', companyId),
                Query.greaterThan('current_weight', 0),
                Query.orderDesc('received_date')
            ]);
            if (error) return { success: false, error };
            const batches: CommodityBatch[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, batchNumber: item.batch_number,
                commodityTypeId: item.commodity_type_id, supplierId: item.supplier_id,
                purchaseContractId: item.purchase_contract_id, locationId: item.location_id,
                cropYear: item.crop_year, receivedDate: item.received_date,
                receivedWeight: item.received_weight, currentWeight: item.current_weight,
                packagingInfo: item.packaging_info, grade: item.grade, status: item.status,
                costPerTon: item.cost_per_ton, totalCost: item.total_cost,
                currency: item.currency, notes: item.notes, createdBy: item.created_by,
                createdAt: item.$createdAt, updatedAt: item.$updatedAt
            }));
            return { success: true, data: batches };
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
}
