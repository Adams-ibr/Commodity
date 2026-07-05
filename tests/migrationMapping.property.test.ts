// Feature: supabase-to-firebase-migration, Property 7: Migration mapping correctness
// Feature: supabase-to-firebase-migration, Property 8: Migration idempotency
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ── Prevent process.exit from crashing the test runner when the migration
//    script's module-level main() call rejects due to missing env vars ──────
vi.hoisted(() => {
  // @ts-ignore
  process.exit = () => {};
});

// ── Mock firebase-admin/firestore ─────────────────────────────────────────────
vi.mock('firebase-admin/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ _type: 'Timestamp', date: d }),
  },
  getFirestore: vi.fn(() => ({})),
}));

// ── Mock firebase-admin/app ────────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps:       vi.fn(() => [{}]),
  getApp:        vi.fn(() => ({})),
  cert:          vi.fn(() => ({})),
}));

// ── Mock @supabase/supabase-js ────────────────────────────────────────────────
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ range: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
    })),
  })),
}));

// Import the pure mapping function after all mocks are in place
import { mapRowToDocument } from '../scripts/migrate-supabase-to-firestore';

// ── Helper ────────────────────────────────────────────────────────────────────
function isTimestampStub(v: unknown): v is { _type: string; date: Date } {
  return (
    typeof v === 'object' && v !== null &&
    (v as any)._type === 'Timestamp' &&
    (v as any).date instanceof Date
  );
}

// =============================================================================
// Property 7 — Migration mapping correctness
// =============================================================================
describe('Property 7 — Migration mapping correctness', () => {
  it('maps UUID id, converts timestamps, handles null FKs, preserves other fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          id:          fc.uuid(),
          created_at:  fc.date({ min: new Date(0), max: new Date('2100-01-01') }).map(d => d.toISOString()),
          updated_at:  fc.date({ min: new Date(0), max: new Date('2100-01-01') }).map(d => d.toISOString()),
          supplier_id: fc.option(fc.uuid(), { nil: null }),
          name:        fc.string(),
          amount:      fc.integer(),
        }),
        (row) => {
          const { docId, data } = mapRowToDocument(row as Record<string, unknown>);

          // Requirement 9.1: UUID primary key → document ID
          expect(docId).toBe(row.id);

          // Requirement 9.2: TIMESTAMPTZ → Firestore Timestamp stub
          expect(isTimestampStub(data.created_at)).toBe(true);
          expect(isTimestampStub(data.updated_at)).toBe(true);

          // Requirement 9.3: NULL FK → explicit null (not undefined/omitted)
          if (row.supplier_id === null) {
            expect(data.supplier_id).toBe(null);
            expect('supplier_id' in data).toBe(true);
          }

          // Other fields pass through unchanged
          expect(data.name).toBe(row.name);
          expect(data.amount).toBe(row.amount);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 8 — Migration idempotency
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 8: Migration idempotency
describe('Property 8 — Migration idempotency', () => {
  it('running the mapping + upsert twice produces the same store as running it once', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id:    fc.uuid(),
            name:  fc.string(),
            value: fc.integer(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (rows) => {
          // In-memory Firestore mock — set with merge:true semantics → overwrite by id
          const store = new Map<string, any>();

          const applyRows = (rowList: typeof rows) => {
            for (const row of rowList) {
              const { docId, data } = mapRowToDocument(row as Record<string, unknown>);
              store.set(docId, { ...(store.get(docId) ?? {}), ...data });
            }
          };

          // First run
          applyRows(rows);
          const sizeAfterFirstRun = store.size;

          // Second run (same rows)
          applyRows(rows);

          // Requirement 9.5: no duplicates, store size unchanged
          expect(store.size).toBe(rows.length);
          expect(store.size).toBe(sizeAfterFirstRun);

          // Data identical after second run
          for (const row of rows) {
            expect(store.get(row.id)?.name).toBe(row.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
