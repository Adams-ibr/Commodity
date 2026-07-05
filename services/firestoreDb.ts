// =====================================================
// FIRESTORE DATABASE HELPER
// =====================================================
// Drop-in replacement for services/supabaseDb.ts.
// Exposes an identical API surface so all service files
// require only an import path change — no logic rewrites.
//
// Exports: dbList, dbGet, dbCreate, dbUpdate, dbDelete,
//          dbCreateBulk, Query, ID, COLLECTIONS

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query as firestoreQuery,
    where,
    orderBy,
    limit as firestoreLimit,
    startAfter,
    Timestamp,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore';
import { firestoreDb } from './firebaseClient';

// ──── COLLECTIONS (collection names — identical to supabaseDb.ts) ────
export const COLLECTIONS = {
    SUPPLIERS: 'suppliers',
    BUYERS: 'buyers',
    COMMODITY_CATEGORIES: 'commodity_categories',
    COMMODITY_TYPES: 'commodity_types',
    COMMODITY_BATCHES: 'commodity_batches',
    PURCHASE_CONTRACTS: 'purchase_contracts',
    ADVANCE_PAYMENTS: 'advance_payments',
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
    INVOICES: 'invoices',
    PURCHASE_CONTRACT_ITEMS: 'purchase_contract_items',
    SALES_CONTRACT_ITEMS: 'sales_contract_items',
    EXPORT_COMPLIANCE: 'export_compliance',
} as const;

// ──── ID helper ────
export const ID = {
    unique: (): string => crypto.randomUUID(),
};

// ──── Query compatibility layer ────
// Query builders return serialised JSON strings.
// The format mirrors supabaseDb.ts exactly so all existing
// call sites are untouched.

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
    equal: (attribute: string, value: any): string =>
        encodeQuery({ method: 'equal', attribute, values: Array.isArray(value) ? value : [value] }),
    notEqual: (attribute: string, value: any): string =>
        encodeQuery({ method: 'notEqual', attribute, values: [value] }),
    greaterThan: (attribute: string, value: any): string =>
        encodeQuery({ method: 'greaterThan', attribute, values: [value] }),
    greaterThanEqual: (attribute: string, value: any): string =>
        encodeQuery({ method: 'greaterThanEqual', attribute, values: [value] }),
    lessThan: (attribute: string, value: any): string =>
        encodeQuery({ method: 'lessThan', attribute, values: [value] }),
    lessThanEqual: (attribute: string, value: any): string =>
        encodeQuery({ method: 'lessThanEqual', attribute, values: [value] }),
    search: (attribute: string, value: string): string =>
        encodeQuery({ method: 'search', attribute, values: [value] }),
    orderAsc: (attribute: string): string =>
        encodeQuery({ method: 'orderAsc', attribute }),
    orderDesc: (attribute: string): string =>
        encodeQuery({ method: 'orderDesc', attribute }),
    limit: (value: number): string =>
        encodeQuery({ method: 'limit', values: [value] }),
    offset: (value: number): string =>
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

// ──── Column name mapping (Appwrite aliases → Firestore field names) ────
function mapColumn(col: string): string {
    const MAP: Record<string, string> = {
        '$id': 'id',
        '$createdAt': 'created_at',
        '$updatedAt': 'updated_at',
    };
    return MAP[col] ?? col;
}

// ──── Task 3.2: normalizeDoc helper ────
// Maps Firestore document data to the shape expected by service files,
// adding $id, $createdAt, $updatedAt aliases. Timestamps are converted
// to ISO 8601 strings.
function normalizeDoc(id: string, data: DocumentData): any {
    const toIso = (val: any): string | null => {
        if (val instanceof Timestamp) return val.toDate().toISOString();
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') return val;
        return null;
    };

    return {
        ...data,
        id,
        $id: id,
        $createdAt: toIso(data.created_at),
        $updatedAt: toIso(data.updated_at),
    };
}

// ──── Build Firestore QueryConstraints from parsed Query objects ────
// Returns constraints plus extracted limitVal and offsetVal.
interface DecodedConstraints {
    constraints: QueryConstraint[];
    limitVal: number;
    offsetVal: number;
}

function buildConstraints(queries: string[]): DecodedConstraints {
    const constraints: QueryConstraint[] = [];
    let limitVal = 100;
    let offsetVal = 0;

    for (const qStr of queries) {
        let q: ParsedQuery;
        try {
            q = decodeQuery(qStr);
        } catch {
            continue;
        }

        const attr = mapColumn(q.attribute ?? '');
        const val = q.values?.[0];

        switch (q.method) {
            case 'equal':
                if (q.values && q.values.length > 1) {
                    // Task 3.8: array value → Firestore `in`
                    constraints.push(where(attr, 'in', q.values));
                } else {
                    constraints.push(where(attr, '==', val));
                }
                break;
            case 'notEqual':
                constraints.push(where(attr, '!=', val));
                break;
            case 'greaterThan':
                constraints.push(where(attr, '>', val));
                break;
            case 'greaterThanEqual':
                constraints.push(where(attr, '>=', val));
                break;
            case 'lessThan':
                constraints.push(where(attr, '<', val));
                break;
            case 'lessThanEqual':
                constraints.push(where(attr, '<=', val));
                break;
            case 'search':
                // Task 3.8: prefix search using range query
                // Matches documents where field >= value and field <= value + '\uf8ff'
                constraints.push(where(attr, '>=', val));
                constraints.push(where(attr, '<=', val + '\uf8ff'));
                break;
            case 'orderAsc':
                constraints.push(orderBy(attr, 'asc'));
                break;
            case 'orderDesc':
                constraints.push(orderBy(attr, 'desc'));
                break;
            case 'limit':
                limitVal = Number(val);
                break;
            case 'offset':
                offsetVal = Number(val);
                break;
        }
    }

    return { constraints, limitVal, offsetVal };
}

// ──── Task 3.3: dbGet ────
// Retrieves a single document by ID. Returns { data: null, error: null }
// when the document does not exist (not an error condition).
export async function dbGet<T = any>(
    col: string,
    recordId: string
): Promise<DbResponse<T>> {
    try {
        const docRef = doc(firestoreDb, col, recordId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            // Document not found is not an error
            return { data: null, error: null };
        }

        return { data: normalizeDoc(snap.id, snap.data()) as T, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbGet ${col}: ${msg}`);
        return { data: null, error: msg };
    }
}

// ──── Task 3.4: dbCreate ────
// Creates a document using setDoc. Uses the provided recordId as the
// document ID; if omitted, generates a UUID. Stores created_at and
// updated_at as serverTimestamp().
export async function dbCreate<T = any>(
    col: string,
    data: Record<string, any>,
    recordId?: string
): Promise<DbResponse<T>> {
    try {
        const id = recordId ?? crypto.randomUUID();
        const docRef = doc(firestoreDb, col, id);

        const payload: Record<string, any> = {
            ...data,
            id,
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
        };

        await setDoc(docRef, payload);

        // Re-read to return normalised document
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            return { data: null, error: 'Document not found after creation' };
        }

        return { data: normalizeDoc(snap.id, snap.data()) as T, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbCreate ${col}: ${msg}`);
        return { data: null, error: msg };
    }
}

// ──── Task 3.5: dbUpdate ────
// Partial update using Firestore updateDoc (does NOT overwrite).
// Updates updated_at with the current timestamp.
export async function dbUpdate<T = any>(
    col: string,
    recordId: string,
    data: Record<string, any>
): Promise<DbResponse<T>> {
    try {
        const docRef = doc(firestoreDb, col, recordId);

        const payload: Record<string, any> = {
            ...data,
            updated_at: Timestamp.now(),
        };

        await updateDoc(docRef, payload);

        // Re-read to return normalised document
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            return { data: null, error: 'Document not found after update' };
        }

        return { data: normalizeDoc(snap.id, snap.data()) as T, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbUpdate ${col}: ${msg}`);
        return { data: null, error: msg };
    }
}

// ──── Task 3.6: dbDelete ────
// Deletes a document by ID. Returns { success: true, error: null } on success.
export async function dbDelete(
    col: string,
    recordId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        const docRef = doc(firestoreDb, col, recordId);
        await deleteDoc(docRef);
        return { success: true, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbDelete ${col}: ${msg}`);
        return { success: false, error: msg };
    }
}

// ──── Task 3.7: dbCreateBulk ────
// Batch-creates multiple documents using WriteBatch.
// Firestore batches are limited to 500 operations; this splits into
// chunks of 500 if needed.
export async function dbCreateBulk<T = any>(
    col: string,
    rows: Record<string, any>[]
): Promise<{ data: T[] | null; error: string | null }> {
    try {
        const BATCH_LIMIT = 500;
        const now = Timestamp.now();
        const createdIds: string[] = [];

        // Split into chunks of 500
        for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
            const chunk = rows.slice(i, i + BATCH_LIMIT);
            const batch = writeBatch(firestoreDb);

            for (const row of chunk) {
                const id = row.id ?? crypto.randomUUID();
                createdIds.push(id);
                const docRef = doc(firestoreDb, col, id);
                batch.set(docRef, {
                    ...row,
                    id,
                    created_at: now,
                    updated_at: now,
                });
            }

            await batch.commit();
        }

        // Re-read all created documents to return normalised results
        const results: T[] = [];
        for (const id of createdIds) {
            const snap = await getDoc(doc(firestoreDb, col, id));
            if (snap.exists()) {
                results.push(normalizeDoc(snap.id, snap.data()) as T);
            }
        }

        return { data: results, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbCreateBulk ${col}: ${msg}`);
        return { data: null, error: msg };
    }
}

// ──── Tasks 3.8 + 3.9: dbList ────
// Lists documents with Query-encoded filters, ordering, pagination, and
// cursor-based offset emulation (startAfter).
export async function dbList<T = any>(
    col: string,
    queries: string[] = []
): Promise<DbListResponse<T>> {
    try {
        const colRef = collection(firestoreDb, col);
        const { constraints, limitVal, offsetVal } = buildConstraints(queries);

        // ── Task 3.9: Cursor-based offset emulation ──────────────────────────
        // Firestore does not support numeric offsets. When offset > 0 we first
        // fetch `offsetVal` documents (with the same ordering but no limit) to
        // obtain the cursor document, then re-run the full query from that point.
        let cursorConstraint: QueryConstraint[] = [];

        if (offsetVal > 0) {
            // Build a query with just filters + ordering + limit=offsetVal to
            // reach the cursor position.
            const cursorQuery = firestoreQuery(colRef, ...constraints, firestoreLimit(offsetVal));
            const cursorSnap = await getDocs(cursorQuery);
            const docs = cursorSnap.docs;
            if (docs.length === offsetVal) {
                // Cursor at the last document fetched for the offset
                cursorConstraint = [startAfter(docs[docs.length - 1])];
            } else if (docs.length > 0) {
                // Fewer docs than offset — start after the last available doc
                cursorConstraint = [startAfter(docs[docs.length - 1])];
            }
            // If no docs fetched the cursor is beyond the end — result is empty
        }

        // ── Get total count (filters applied, no limit/offset) ──────────────
        // Count query uses only where constraints (no orderBy/limit to keep it simple)
        const filterConstraints = constraints.filter(
            (c) => !(c as any).type || (c as any).type !== 'limit'
        );
        const countQuery = firestoreQuery(colRef, ...filterConstraints);
        const countSnap = await getDocs(countQuery);
        const total = countSnap.size;

        // ── Main data query ─────────────────────────────────────────────────
        const dataQuery = firestoreQuery(
            colRef,
            ...constraints,
            ...cursorConstraint,
            firestoreLimit(limitVal)
        );
        const dataSnap = await getDocs(dataQuery);

        const data = dataSnap.docs.map((d) => normalizeDoc(d.id, d.data()) as T);

        return { data, total, error: null };
    } catch (err: any) {
        const msg: string = err?.message ?? 'Unknown error';
        console.error(`[firestoreDb] dbList ${col}: ${msg}`);
        return { data: [], total: 0, error: msg };
    }
}
