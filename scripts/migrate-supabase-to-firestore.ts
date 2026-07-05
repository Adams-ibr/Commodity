#!/usr/bin/env tsx
// =====================================================
// SUPABASE → FIRESTORE MIGRATION SCRIPT
// =====================================================
// Reads all rows from every Supabase table and upserts
// equivalent documents into the corresponding Firestore
// collection using { merge: true } semantics, so the
// script is safe to re-run.
//
// Usage:
//   SUPABASE_URL=https://... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   FIREBASE_PROJECT_ID=... \
//   FIREBASE_CLIENT_EMAIL=... \
//   FIREBASE_PRIVATE_KEY=... \
//   npm run migrate
//
// Environment variables:
//   SUPABASE_URL             — Supabase project URL (falls back to VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY — Supabase service-role key (full access, bypasses RLS)
//   FIREBASE_PROJECT_ID      — Firebase project ID
//   FIREBASE_CLIENT_EMAIL    — Service account client email
//   FIREBASE_PRIVATE_KEY     — Service account private key (newlines escaped as \n)
// =====================================================

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

// ──── Collections to migrate ────────────────────────────────────────────────
const COLLECTIONS_TO_MIGRATE = [
    'suppliers',
    'buyers',
    'commodity_categories',
    'commodity_types',
    'commodity_batches',
    'purchase_contracts',
    'advance_payments',
    'sales_contracts',
    'shipments',
    'shipment_batches',
    'processing_orders',
    'quality_tests',
    'locations',
    'users',
    'audit_logs',
    'accounts',
    'journal_entries',
    'journal_entry_lines',
    'batch_movements',
    'documents',
    'exchange_rates',
    'compliance_records',
    'trade_finance',
    'goods_receipts',
    'invoices',
    'purchase_contract_items',
    'sales_contract_items',
] as const;

// ──── ISO 8601 date-time detection ──────────────────────────────────────────
// A value is treated as a timestamp if:
//   (a) it is a non-null string that matches an ISO 8601 date-time pattern
//       (contains 'T' separator and ends with 'Z' or a timezone offset), OR
//   (b) the field name ends in '_at' (e.g. created_at, updated_at)
function isTimestampValue(fieldName: string, value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'string') return false;

    // Field name heuristic
    if (fieldName.endsWith('_at')) return true;

    // ISO 8601 date-time pattern: contains 'T' and ends with Z or offset (+/-HH:MM)
    const iso8601Pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
    return iso8601Pattern.test(value as string);
}

// ──── Row → Firestore document mapping ──────────────────────────────────────
/**
 * Maps a Supabase row to a Firestore document.
 *
 * Rules:
 *  - UUID `id` column → returned as docId (document ID), also kept as `id` field
 *  - TIMESTAMPTZ / date strings → Firestore Admin Timestamp.fromDate(new Date(value))
 *  - JSONB (objects) → nested map (already plain JS objects, pass through)
 *  - TEXT[] (arrays) → Firestore array (already JS arrays, pass through)
 *  - NULL FK references → `null` field (explicitly written, not omitted)
 *
 * @param row - A raw row object from Supabase
 * @returns { docId, data } where docId is the UUID primary key and data is
 *          the mapped Firestore document (ready to pass to batch.set)
 */
export function mapRowToDocument(row: Record<string, unknown>): {
    docId: string;
    data: Record<string, unknown>;
} {
    const docId = row['id'] as string;
    const data: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
        if (value === null) {
            // Requirement 9.3: NULL FK references SHALL be written as null, not omitted
            data[key] = null;
        } else if (isTimestampValue(key, value)) {
            // Requirement 9.2: TIMESTAMPTZ → Firestore Timestamp
            try {
                data[key] = Timestamp.fromDate(new Date(value as string));
            } catch {
                // If parsing fails, keep the original value (defensive fallback)
                data[key] = value;
            }
        } else {
            // Objects (JSONB), arrays (TEXT[]), strings, numbers, booleans — pass through
            data[key] = value;
        }
    }

    return { docId, data };
}

// ──── Firebase Admin initialisation ─────────────────────────────────────────
function initFirebase() {
    if (getApps().length > 0) {
        return getApp();
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            '[migrate] Missing Firebase Admin credentials. ' +
            'Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.'
        );
    }

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
}

// ──── Supabase reader ────────────────────────────────────────────────────────
const SUPABASE_BATCH_SIZE = 1000;

async function* readSupabaseCollection(
    supabase: ReturnType<typeof createClient>,
    tableName: string
): AsyncGenerator<Record<string, unknown>[]> {
    let offset = 0;

    while (true) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(offset, offset + SUPABASE_BATCH_SIZE - 1);

        if (error) {
            throw new Error(`[migrate] Supabase read error on "${tableName}": ${error.message}`);
        }

        if (!data || data.length === 0) {
            break;
        }

        yield data as Record<string, unknown>[];

        if (data.length < SUPABASE_BATCH_SIZE) {
            // Last page — no more rows
            break;
        }

        offset += SUPABASE_BATCH_SIZE;
    }
}

// ──── Firestore writer ───────────────────────────────────────────────────────
const FIRESTORE_BATCH_SIZE = 500;

async function writeToFirestore(
    db: FirebaseFirestore.Firestore,
    collectionName: string,
    rows: Record<string, unknown>[]
): Promise<{ written: number; failed: number }> {
    let written = 0;
    let failed = 0;

    // Split into Firestore batch chunks of 500
    for (let i = 0; i < rows.length; i += FIRESTORE_BATCH_SIZE) {
        const chunk = rows.slice(i, i + FIRESTORE_BATCH_SIZE);
        const batch = db.batch();
        const docIds: string[] = [];

        for (const row of chunk) {
            try {
                const { docId, data } = mapRowToDocument(row);
                const docRef = db.collection(collectionName).doc(docId);
                // Requirement 9.5: upsert using { merge: true }
                batch.set(docRef, data, { merge: true });
                docIds.push(docId);
            } catch (mappingErr: unknown) {
                const errMsg = mappingErr instanceof Error ? mappingErr.message : String(mappingErr);
                const rowId = (row['id'] as string) ?? '(unknown)';
                // Requirement 9.4: log failures without aborting
                console.error(
                    `[migrate] ✗ Mapping failed for ${collectionName}/${rowId}: ${errMsg}`
                );
                failed++;
            }
        }

        try {
            await batch.commit();
            written += docIds.length;
        } catch (batchErr: unknown) {
            const errMsg = batchErr instanceof Error ? batchErr.message : String(batchErr);
            // Requirement 9.4: log batch failure, count each doc in batch as failed
            console.error(
                `[migrate] ✗ Batch write failed for ${collectionName} ` +
                `(docs: ${docIds.join(', ')}): ${errMsg}`
            );
            failed += docIds.length;
        }
    }

    return { written, failed };
}

// ──── Migrate a single collection ────────────────────────────────────────────
async function migrateCollection(
    supabase: ReturnType<typeof createClient>,
    db: FirebaseFirestore.Firestore,
    collectionName: string
): Promise<void> {
    console.log(`\n[migrate] ──── ${collectionName} ────`);

    let totalRead = 0;
    let totalWritten = 0;
    let totalFailed = 0;

    try {
        for await (const batch of readSupabaseCollection(supabase, collectionName)) {
            totalRead += batch.length;
            const { written, failed } = await writeToFirestore(db, collectionName, batch);
            totalWritten += written;
            totalFailed += failed;
        }
    } catch (readErr: unknown) {
        const errMsg = readErr instanceof Error ? readErr.message : String(readErr);
        console.error(`[migrate] ✗ Read error for collection "${collectionName}": ${errMsg}`);
        // Log the failure but don't abort the full migration
        console.log(`[migrate] Skipping remaining rows for "${collectionName}" due to read error.`);
        return;
    }

    // Requirement 9.4: log per-collection record count
    console.log(
        `[migrate] ✓ ${collectionName}: read=${totalRead}, written=${totalWritten}, failed=${totalFailed}`
    );
}

// ──── Main entry point ───────────────────────────────────────────────────────
async function main(): Promise<void> {
    console.log('[migrate] Starting Supabase → Firestore migration...');

    // ── Supabase credentials ─────────────────────────────────────────────────
    const supabaseUrl =
        process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

    if (!supabaseUrl) {
        throw new Error(
            '[migrate] Missing Supabase URL. Set SUPABASE_URL (or VITE_SUPABASE_URL) env var.'
        );
    }
    if (!supabaseServiceRoleKey) {
        throw new Error(
            '[migrate] Missing SUPABASE_SERVICE_ROLE_KEY env var.'
        );
    }

    // ── Firebase Admin ───────────────────────────────────────────────────────
    const firebaseApp = initFirebase();
    const db = getFirestore(firebaseApp);

    // ── Supabase client (service role — bypasses RLS) ────────────────────────
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    console.log(`[migrate] Migrating ${COLLECTIONS_TO_MIGRATE.length} collections...`);

    // ── Iterate collections ──────────────────────────────────────────────────
    let collectionErrors = 0;
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
        try {
            await migrateCollection(supabase, db, collectionName);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            console.error(
                `[migrate] ✗ Fatal error migrating collection "${collectionName}": ${errMsg}`
            );
            collectionErrors++;
        }
    }

    if (collectionErrors > 0) {
        console.error(
            `\n[migrate] Migration completed with ${collectionErrors} collection-level error(s).`
        );
        process.exit(1);
    } else {
        console.log('\n[migrate] ✓ Migration completed successfully.');
        process.exit(0);
    }
}

main().catch((err: unknown) => {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[migrate] Unhandled error: ${errMsg}`);
    process.exit(1);
});
