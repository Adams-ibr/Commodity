// =====================================================
// API REGISTRY — APPWRITE
// =====================================================

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    action: string;
    details: string;
    user: string;
    role: string;
    ipHash?: string;
}

import { dbList, dbCreate, dbUpdate, dbDelete, Query, ID } from './appwriteDb';
import { COLLECTIONS } from './appwriteConfig';
import { UserRole, Location } from '../types_commodity';
import { ProcurementService } from './procurementService';
import { CommodityMasterService } from './commodityMasterService';
import { QualityControlService } from './qualityControlService';
import { ProcessingService } from './processingService';
import { WarehouseService } from './warehouseService';
import { SalesService } from './salesService';
import { DocumentService } from './documentService';
import { AccountingService } from './accountingService';
import { FXService } from './fxService';
import { TradeFinanceService } from './tradeFinanceService';
import { ComplianceService } from './complianceService';
import { ReportingService } from './reportingService';
import { authService } from './authService';

export const api = {
    auth: authService,
    commodityMaster: new CommodityMasterService(),
    procurement: new ProcurementService(),
    qualityControl: new QualityControlService(),
    processing: new ProcessingService(),
    warehouse: new WarehouseService(),
    sales: new SalesService(),
    documents: new DocumentService(),
    accounting: new AccountingService(),
    fx: new FXService(),
    tradeFinance: new TradeFinanceService(),
    compliance: new ComplianceService(),
    reporting: new ReportingService(),

    audit: {
        async log(action: string, details: string, user: string, role: string) {
            try {
                await dbCreate(COLLECTIONS.AUDIT_LOGS, {
                    action,
                    details,
                    user_id: user,
                    user_role: role,
                    ip_hash: '127.0.0.1'
                });
            } catch (err) {
                console.error('Audit log exception:', err);
            }
        },

        async getAll(): Promise<AuditLogEntry[]> {
            const { data } = await dbList(COLLECTIONS.AUDIT_LOGS, [
                Query.orderDesc('$createdAt'),
                Query.limit(100)
            ]);
            return (data || []).map((l: any) => ({
                id: l.$id,
                timestamp: l.$createdAt,
                action: l.action,
                details: l.details,
                user: l.user_id,
                role: l.user_role as UserRole,
                ipHash: l.ip_hash
            }));
        },

        async getLogs(date: string, page: number = 1, limit: number = 50): Promise<{ data: AuditLogEntry[], count: number }> {
            const startOfDay = `${date}T00:00:00.000Z`;
            const endOfDay = `${date}T23:59:59.999Z`;
            const offset = (page - 1) * limit;

            const { data, total } = await dbList(COLLECTIONS.AUDIT_LOGS, [
                Query.greaterThanEqual('$createdAt', startOfDay),
                Query.lessThanEqual('$createdAt', endOfDay),
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]);

            const logs = (data || []).map((l: any) => ({
                id: l.$id,
                timestamp: l.$createdAt,
                action: l.action,
                details: l.details,
                user: l.user_id,
                role: l.user_role as UserRole,
                ipHash: l.ip_hash
            }));

            return { data: logs, count: total || 0 };
        },

        async search(params: { query?: string; action?: string; date?: string; page?: number; limit?: number }): Promise<{ data: AuditLogEntry[], count: number }> {
            const { query, action, date, page = 1, limit = 50 } = params;
            const offset = (page - 1) * limit;
            const queries: string[] = [Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset)];

            if (date) {
                queries.push(Query.greaterThanEqual('$createdAt', `${date}T00:00:00.000Z`));
                queries.push(Query.lessThanEqual('$createdAt', `${date}T23:59:59.999Z`));
            }
            if (action) queries.push(Query.equal('action', action));

            const { data, total } = await dbList(COLLECTIONS.AUDIT_LOGS, queries);
            let logs = (data || []).map((l: any) => ({
                id: l.$id, timestamp: l.$createdAt, action: l.action,
                details: l.details, user: l.user_id, role: l.user_role as UserRole, ipHash: l.ip_hash
            }));

            // Client-side text search
            if (query) {
                const q = query.toLowerCase();
                logs = logs.filter((l: AuditLogEntry) =>
                    l.action.toLowerCase().includes(q) ||
                    l.details.toLowerCase().includes(q) ||
                    l.user.toLowerCase().includes(q)
                );
            }

            return { data: logs, count: total || 0 };
        },

        exportCSV(logs: AuditLogEntry[]): string {
            const header = 'Timestamp,Action,Details,User,Role\n';
            const rows = logs.map(l =>
                `"${l.timestamp}","${l.action}","${l.details.replace(/"/g, '""')}","${l.user}","${l.role}"`
            ).join('\n');
            return header + rows;
        }
    },

    locations: {
        async getAll(): Promise<Location[]> {
            const { data } = await dbList(COLLECTIONS.LOCATIONS, [
                Query.orderAsc('name')
            ]);
            if (!data) return [];
            return data.map((l: any) => ({
                id: l.$id,
                companyId: l.company_id || 'default',
                code: l.code || 'LOC-000',
                name: l.name,
                type: l.type,
                address: l.address,
                isActive: l.is_active,
                createdAt: l.$createdAt
            }));
        },

        async create(location: Omit<Location, 'id' | 'createdAt'>): Promise<Location | null> {
            const { data } = await dbCreate(COLLECTIONS.LOCATIONS, {
                name: location.name,
                type: location.type,
                address: location.address,
                is_active: location.isActive,
                code: location.code || 'LOC-000',
                company_id: location.companyId || 'default'
            });
            if (!data) return null;
            return {
                id: data.$id,
                companyId: data.company_id || 'default',
                code: data.code || 'LOC-000',
                name: data.name,
                type: data.type,
                address: data.address,
                isActive: data.is_active,
                createdAt: data.$createdAt
            };
        },

        async update(id: string, updates: Partial<Location>): Promise<boolean> {
            const payload: any = {};
            if (updates.name) payload.name = updates.name;
            if (updates.type) payload.type = updates.type;
            if (updates.address) payload.address = updates.address;
            if (updates.isActive !== undefined) payload.is_active = updates.isActive;
            const { error } = await dbUpdate(COLLECTIONS.LOCATIONS, id, payload);
            return !error;
        },

        async delete(id: string): Promise<boolean> {
            const { error } = await dbUpdate(COLLECTIONS.LOCATIONS, id, { is_active: false });
            return !error;
        }
    },

    users: {
        async getAll() {
            const { data } = await dbList(COLLECTIONS.USERS, [Query.orderAsc('name')]);
            if (!data) return [];
            return data.map((u: any) => ({
                id: u.$id,
                email: u.email,
                name: u.name,
                role: u.role as UserRole,
                locationId: u.location_id || u.locationId,
                isActive: u.is_active,
                createdAt: u.$createdAt
            }));
        },

        async create(userData: any) {
            const { data } = await dbCreate(COLLECTIONS.USERS, userData);
            return data ? { ...data, id: data.$id } : null;
        },

        async update(id: string, updates: any) {
            const payload: any = {};
            if (updates.name) payload.name = updates.name;
            if (updates.role) payload.role = updates.role;
            if (updates.locationId) payload.location_id = updates.locationId;
            const { data } = await dbUpdate(COLLECTIONS.USERS, id, payload);
            if (!data) return null;
            return {
                id: data.$id,
                email: data.email,
                name: data.name,
                role: data.role as UserRole,
                locationId: data.location_id,
                isActive: data.is_active,
                createdAt: data.$createdAt
            };
        },

        async toggleStatus(id: string, isActive: boolean) {
            const { error } = await dbUpdate(COLLECTIONS.USERS, id, { is_active: isActive });
            return !error;
        },

        async delete(id: string) {
            const { success } = await dbDelete(COLLECTIONS.USERS, id);
            return success;
        }
    }
};
