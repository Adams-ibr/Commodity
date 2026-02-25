// =====================================================
// SUPABASE DATABASE HELPER
// =====================================================
// Provides a consistent API surface for all service files.
//
// Exports: dbList, dbGet, dbCreate, dbUpdate, dbDelete, Query, ID, COLLECTIONS

import { supabase } from './supabaseClient';

// ──── COLLECTIONS (table names — same IDs as before) ────
export const COLLECTIONS = {
    SUPPLIERS: 'suppliers',
    BUYERS: 'buyers',
    COMMODITY_CATEGORIES: 'commodity_categories',
    COMMODITY_TYPES: 'commodity_types',
    COMMODITY_BATCHES: 'commodity_batches',
    PURCHASE_CONTRACTS: 'purchase_contracts',
    SALES_CONTRACTS: 'sales_contracts',
    SHIPMENTS: 'shipments',
    SHIPMENT_BATCHES: 'shipment_batches',
    PROCESSING_ORDERS: 'processing_orders',
    QUALITY_TESTS: 'quality_tests',
    LOCATIONS: 'locations',
    USERS: 'users',
    AUDIT_LOGS: 'audit_logs',
    ACCOUNTS: 'accounts',
    JOURNAL_ENTRIES: 'journal_entries',
    JOURNAL_ENTRY_LINES: 'journal_entry_lines',
    BATCH_MOVEMENTS: 'batch_movements',
    DOCUMENTS: 'documents',
    EXCHANGE_RATES: 'exchange_rates',
    COMPLIANCE_RECORDS: 'compliance_records',
    TRADE_FINANCE: 'trade_finance',
    GOODS_RECEIPTS: 'goods_receipts',
} as const;

// ──── ID helper ────
export const ID = {
    unique: () => crypto.randomUUID(),
};

// ──── Query compatibility layer ────
// Query builders return serialized JSON strings.
// dbList parses them to apply Supabase PostgREST filters.

interface ParsedQuery {
    method: string;
    attribute?: string;
    values?: any[];
}

function encodeQuery(q: ParsedQuery): string {
    return JSON.stringify(q);
}

function decodeQuery(s: string): ParsedQuery {
    return JSON.parse(s);
}

export const Query = {
    equal: (attribute: string, value: any) =>
        encodeQuery({ method: 'equal', attribute, values: Array.isArray(value) ? value : [value] }),
    notEqual: (attribute: string, value: any) =>
        encodeQuery({ method: 'notEqual', attribute, values: [value] }),
    greaterThan: (attribute: string, value: any) =>
        encodeQuery({ method: 'greaterThan', attribute, values: [value] }),
    greaterThanEqual: (attribute: string, value: any) =>
        encodeQuery({ method: 'greaterThanEqual', attribute, values: [value] }),
    lessThan: (attribute: string, value: any) =>
        encodeQuery({ method: 'lessThan', attribute, values: [value] }),
    lessThanEqual: (attribute: string, value: any) =>
        encodeQuery({ method: 'lessThanEqual', attribute, values: [value] }),
    search: (attribute: string, value: string) =>
        encodeQuery({ method: 'search', attribute, values: [value] }),
    orderAsc: (attribute: string) =>
        encodeQuery({ method: 'orderAsc', attribute }),
    orderDesc: (attribute: string) =>
        encodeQuery({ method: 'orderDesc', attribute }),
    limit: (value: number) =>
        encodeQuery({ method: 'limit', values: [value] }),
    offset: (value: number) =>
        encodeQuery({ method: 'offset', values: [value] }),
};

// ──── Response types ────
export interface DbResponse<T> {
    data: T | null;
    error: string | null;
}

export interface DbListResponse<T> {
    data: T[];
    total: number;
    error: string | null;
}

// ──── Apply parsed queries to a Supabase query builder ────
function applyQueries(
    queryBuilder: any,
    queries: string[]
): { builder: any; limitVal: number; offsetVal: number } {
    let limitVal = 100;
    let offsetVal = 0;

    for (const qStr of queries) {
        let q: ParsedQuery;
        try { q = decodeQuery(qStr); } catch { continue; }

        const attr = q.attribute || '';
        const val = q.values?.[0];

        switch (q.method) {
            case 'equal':
                if (q.values && q.values.length > 1) {
                    queryBuilder = queryBuilder.in(attr, q.values);
                } else {
                    queryBuilder = queryBuilder.eq(attr, val);
                }
                break;
            case 'notEqual':
                queryBuilder = queryBuilder.neq(attr, val);
                break;
            case 'greaterThan':
                queryBuilder = queryBuilder.gt(attr, val);
                break;
            case 'greaterThanEqual':
                queryBuilder = queryBuilder.gte(attr, val);
                break;
            case 'lessThan':
                queryBuilder = queryBuilder.lt(attr, val);
                break;
            case 'lessThanEqual':
                queryBuilder = queryBuilder.lte(attr, val);
                break;
            case 'search':
                queryBuilder = queryBuilder.ilike(attr, `%${val}%`);
                break;
            case 'orderAsc':
                queryBuilder = queryBuilder.order(attr, { ascending: true });
                break;
            case 'orderDesc':
                queryBuilder = queryBuilder.order(attr, { ascending: false });
                break;
            case 'limit':
                limitVal = Number(val);
                break;
            case 'offset':
                offsetVal = Number(val);
                break;
        }
    }

    return { builder: queryBuilder, limitVal, offsetVal };
}

// ──── Normalize row: add $id, $createdAt, $updatedAt aliases ────
// Normalize row: add $id, $createdAt, $updatedAt aliases for domain services.
function normalizeRow(row: any): any {
    if (!row) return row;
    return {
        ...row,
        $id: row.id,
        $createdAt: row.created_at,
        $updatedAt: row.updated_at,
    };
}

// ──── CRUD functions ────

export async function dbList<T = any>(
    table: string,
    queries: string[] = []
): Promise<DbListResponse<T>> {
    try {
        // First get total count
        let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
        // Apply only filter queries (not order/limit/offset) for count
        for (const qStr of queries) {
            let q: ParsedQuery;
            try { q = decodeQuery(qStr); } catch { continue; }
            const attr = q.attribute || '';
            const val = q.values?.[0];
            switch (q.method) {
                case 'equal':
                    countQuery = q.values && q.values.length > 1
                        ? countQuery.in(attr, q.values)
                        : countQuery.eq(attr, val);
                    break;
                case 'notEqual': countQuery = countQuery.neq(attr, val); break;
                case 'greaterThan': countQuery = countQuery.gt(attr, val); break;
                case 'greaterThanEqual': countQuery = countQuery.gte(attr, val); break;
                case 'lessThan': countQuery = countQuery.lt(attr, val); break;
                case 'lessThanEqual': countQuery = countQuery.lte(attr, val); break;
                case 'search': countQuery = countQuery.ilike(attr, `%${val}%`); break;
            }
        }
        const { count } = await countQuery;

        // Data query
        let dataQuery = supabase.from(table).select('*');
        const { builder, limitVal, offsetVal } = applyQueries(dataQuery, queries);
        const { data, error } = await builder.range(offsetVal, offsetVal + limitVal - 1);

        if (error) {
            console.error(`[dbList] ${table}:`, error.message);
            return { data: [], total: 0, error: error.message };
        }

        return {
            data: (data || []).map(normalizeRow) as T[],
            total: count || 0,
            error: null,
        };
    } catch (err: any) {
        console.error(`[dbList] ${table}:`, err.message || err);
        return { data: [], total: 0, error: err.message || 'Unknown error' };
    }
}

export async function dbGet<T = any>(
    table: string,
    recordId: string
): Promise<DbResponse<T>> {
    try {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', recordId)
            .single();

        if (error) {
            console.error(`[dbGet] ${table}/${recordId}:`, error.message);
            return { data: null, error: error.message };
        }

        return { data: normalizeRow(data) as T, error: null };
    } catch (err: any) {
        console.error(`[dbGet] ${table}/${recordId}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

export async function dbCreate<T = any>(
    table: string,
    rowData: Record<string, any>,
    recordId?: string
): Promise<DbResponse<T>> {
    try {
        const payload: any = { ...rowData };
        if (recordId) payload.id = recordId;

        const { data, error } = await supabase
            .from(table)
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error(`[dbCreate] ${table}:`, error.message);
            return { data: null, error: error.message };
        }

        return { data: normalizeRow(data) as T, error: null };
    } catch (err: any) {
        console.error(`[dbCreate] ${table}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

export async function dbUpdate<T = any>(
    table: string,
    recordId: string,
    rowData: Record<string, any>
): Promise<DbResponse<T>> {
    try {
        const { data, error } = await supabase
            .from(table)
            .update(rowData)
            .eq('id', recordId)
            .select()
            .single();

        if (error) {
            console.error(`[dbUpdate] ${table}/${recordId}:`, error.message);
            return { data: null, error: error.message };
        }

        return { data: normalizeRow(data) as T, error: null };
    } catch (err: any) {
        console.error(`[dbUpdate] ${table}/${recordId}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

export async function dbDelete(
    table: string,
    recordId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', recordId);

        if (error) {
            console.error(`[dbDelete] ${table}/${recordId}:`, error.message);
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error(`[dbDelete] ${table}/${recordId}:`, err.message || err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}
