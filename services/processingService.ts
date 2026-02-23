// =====================================================
// PROCESSING SERVICE — APPWRITE
// =====================================================
import { dbList, dbCreate, dbUpdate, Query } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { ProcessingOrder, ProcessingType, ProcessingStatus, ProcessingInput, ProcessingOutput, ApiResponse, CommodityBatch, BatchStatus } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class ProcessingService {
    async getOrders(companyId: string = DEFAULT_COMPANY_ID, status?: ProcessingStatus): Promise<ApiResponse<ProcessingOrder[]>> {
        try {
            const queries: string[] = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt')];
            if (status) queries.push(Query.equal('status', status));
            const { data, error } = await dbList(COLLECTIONS.PROCESSING_ORDERS, queries);
            if (error) return { success: false, error };
            const orders: ProcessingOrder[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, orderNumber: item.order_number,
                processingPlantId: item.processing_plant_id, orderDate: item.order_date,
                processingDate: item.processing_date, processingType: item.processing_type,
                status: item.status, supervisorId: item.supervisor_id,
                notes: item.notes, createdAt: item.$createdAt
            }));
            return { success: true, data: orders };
        } catch (error) {
            return { success: false, error: 'Failed to fetch processing orders' };
        }
    }

    async createOrder(orderData: Omit<ProcessingOrder, 'id' | 'createdAt' | 'status'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ProcessingOrder>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.PROCESSING_ORDERS, {
                company_id: companyId, order_number: orderData.orderNumber,
                processing_plant_id: orderData.processingPlantId, order_date: orderData.orderDate,
                processing_date: orderData.processingDate, processing_type: orderData.processingType,
                status: ProcessingStatus.PLANNED, supervisor_id: orderData.supervisorId,
                notes: orderData.notes
            });
            if (error || !data) return { success: false, error: error || 'Failed to create order' };
            return {
                success: true, data: {
                    id: data.$id, companyId: data.company_id, orderNumber: data.order_number,
                    processingPlantId: data.processing_plant_id, orderDate: data.order_date,
                    processingDate: data.processing_date, processingType: data.processing_type,
                    status: data.status, supervisorId: data.supervisor_id,
                    notes: data.notes, createdAt: data.$createdAt
                }
            };
        } catch (error) {
            return { success: false, error: 'Failed to create processing order' };
        }
    }

    async updateOrderStatus(id: string, status: ProcessingStatus, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<ProcessingOrder>> {
        try {
            const { data, error } = await dbUpdate(COLLECTIONS.PROCESSING_ORDERS, id, { status });
            if (error || !data) return { success: false, error: error || 'Failed to update' };
            return {
                success: true, data: {
                    id: data.$id, companyId: data.company_id, orderNumber: data.order_number,
                    processingPlantId: data.processing_plant_id, orderDate: data.order_date,
                    processingDate: data.processing_date, processingType: data.processing_type,
                    status: data.status, supervisorId: data.supervisor_id,
                    notes: data.notes, createdAt: data.$createdAt
                }
            };
        } catch (error) {
            return { success: false, error: 'Failed to update order status' };
        }
    }
}
