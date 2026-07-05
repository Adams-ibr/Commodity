// Feature: supabase-to-firebase-migration
import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ── All hoisted declarations through vi.hoisted ───────────────────────────────
const {
  MockTimestamp,
  getDocSpy,
  setDocSpy,
  updateDocSpy,
  deleteDocSpy,
  getDocsSpy,
  writeBatchSpy,
  collectionSpy,
  docSpy,
  whereSpy,
  orderBySpy,
  limitSpy,
  startAfterSpy,
  querySpy,
} = vi.hoisted(() => {
  class MockTimestamp {
    constructor(public readonly _ms: number) {}
    toDate() { return new Date(this._ms); }
    static now() { return new MockTimestamp(Date.now()); }
    static fromMillis(ms: number) { return new MockTimestamp(ms); }
  }

  return {
    MockTimestamp,
    getDocSpy:      vi.fn(),
    setDocSpy:      vi.fn(),
    updateDocSpy:   vi.fn(),
    deleteDocSpy:   vi.fn(),
    getDocsSpy:     vi.fn(),
    writeBatchSpy:  vi.fn(),
    collectionSpy:  vi.fn(),
    docSpy:         vi.fn(),
    whereSpy:       vi.fn(),
    orderBySpy:     vi.fn(),
    limitSpy:       vi.fn(),
    startAfterSpy:  vi.fn(),
    querySpy:       vi.fn(),
  };
});

vi.mock('firebase/firestore', () => ({
  getDoc:      getDocSpy,
  setDoc:      setDocSpy,
  updateDoc:   updateDocSpy,
  deleteDoc:   deleteDocSpy,
  getDocs:     getDocsSpy,
  writeBatch:  writeBatchSpy,
  collection:  collectionSpy,
  doc:         docSpy,
  where:       whereSpy,
  orderBy:     orderBySpy,
  limit:       limitSpy,
  startAfter:  startAfterSpy,
  query:       querySpy,
  Timestamp:   MockTimestamp,
}));

vi.mock('../services/firebaseClient', () => ({
  firestoreDb: { _isFakeDb: true },
}));

import { dbCreate, dbGet, dbUpdate, dbList, Query } from '../services/firestoreDb';

// ── In-memory Firestore store type ────────────────────────────────────────────
type Store = Map<string, Map<string, any>>;

// ── Helper: build a fake DocumentSnapshot from store ─────────────────────────
function snapFromStore(store: Store, col: string, id: string) {
  const data = store.get(col)?.get(id);
  if (!data) return { id, exists: () => false, data: () => undefined };
  return { id, exists: () => true, data: () => ({ ...data }) };
}

// ── Helper: wire all spies to an in-memory store ──────────────────────────────
function wireStore(store: Store) {
  vi.clearAllMocks();

  docSpy.mockImplementation((_db: any, col: string, id: string) => ({ _col: col, _id: id }));
  collectionSpy.mockImplementation((_db: any, col: string) => ({ _col: col }));
  querySpy.mockImplementation((colRef: any, ...constraints: any[]) => ({
    _col: colRef._col,
    _constraints: constraints,
  }));
  whereSpy.mockImplementation((f: string, op: string, v: any) => ({ _type: 'where', f, op, v }));
  orderBySpy.mockImplementation((f: string, d: string) => ({ _type: 'orderBy', f, d }));
  limitSpy.mockImplementation((n: number) => ({ _type: 'limit', n }));
  startAfterSpy.mockImplementation((c: any) => ({ _type: 'startAfter', c }));

  setDocSpy.mockImplementation(async (ref: any, data: any) => {
    const col = ref._col as string;
    const id  = ref._id  as string;
    if (!store.has(col)) store.set(col, new Map());
    store.get(col)!.set(id, { ...data });
  });

  updateDocSpy.mockImplementation(async (ref: any, patch: any) => {
    const col  = ref._col as string;
    const id   = ref._id  as string;
    const prev = store.get(col)?.get(id) ?? {};
    if (!store.has(col)) store.set(col, new Map());
    store.get(col)!.set(id, { ...prev, ...patch });
  });

  getDocSpy.mockImplementation(async (ref: any) =>
    snapFromStore(store, ref._col as string, ref._id as string)
  );

  getDocsSpy.mockImplementation(async (queryObj: any) => {
    const col     = queryObj._col as string;
    const colData = store.get(col);
    let docs: any[] = [];

    if (colData) {
      colData.forEach((data, id) => {
        docs.push({ id, exists: () => true, data: () => ({ ...data }) });
      });
    }

    for (const c of (queryObj._constraints ?? [])) {
      if (c._type === 'where') {
        docs = docs.filter((d: any) => {
          const val = d.data()[c.f];
          switch (c.op) {
            case '==': return val === c.v;
            case '!=': return val !== c.v;
            case '>':  return val >  c.v;
            case '>=': return val >= c.v;
            case '<':  return val <  c.v;
            case '<=': return val <= c.v;
            case 'in': return Array.isArray(c.v) && c.v.includes(val);
            default:   return true;
          }
        });
      }
      if (c._type === 'limit') { docs = docs.slice(0, c.n); }
      if (c._type === 'startAfter') {
        const cursorId = c.c?.id ?? c.c?._id;
        const idx = docs.findIndex((d: any) => d.id === cursorId);
        if (idx >= 0) docs = docs.slice(idx + 1);
      }
    }

    return { size: docs.length, docs };
  });

  deleteDocSpy.mockImplementation(async (ref: any) => {
    store.get(ref._col as string)?.delete(ref._id as string);
  });

  writeBatchSpy.mockReturnValue({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  });
}

// =============================================================================
// Property 1 — Query constraint fidelity
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 1: Query constraint fidelity
describe('Property 1 — Query constraint fidelity', () => {
  it('encodes operator, attribute, and value correctly for all scalar Query methods', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(
            'equal', 'notEqual', 'greaterThan', 'greaterThanEqual',
            'lessThan', 'lessThanEqual'
          ) as fc.Arbitrary<keyof typeof Query>,
          fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        ),
        ([field, operator, scalar]) => {
          const encoded = Query[operator](field, scalar);
          const decoded = JSON.parse(encoded) as { method: string; attribute: string; values: any[] };

          expect(decoded.method).toBe(operator);
          expect(decoded.attribute).toBe(field);
          expect(decoded.values[0]).toStrictEqual(scalar);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 2 — Create-then-get round-trip
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 2: Create-then-get round-trip
describe('Property 2 — Create-then-get round-trip', () => {
  it('retrieved document contains all original fields plus valid $id, $createdAt, $updatedAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name:   fc.string(),
          value:  fc.integer(),
          active: fc.boolean(),
        }),
        async (record) => {
          const store: Store = new Map();
          wireStore(store);

          const createResult = await dbCreate('test_col', record);
          expect(createResult.error).toBeNull();
          const created = createResult.data!;

          const getResult = await dbGet('test_col', created.$id);
          expect(getResult.error).toBeNull();
          const retrieved = getResult.data!;

          expect(retrieved.name).toBe(record.name);
          expect(retrieved.value).toBe(record.value);
          expect(retrieved.active).toBe(record.active);
          expect(retrieved.$id).toBe(retrieved.id);
          expect(typeof retrieved.$createdAt).toBe('string');
          expect(new Date(retrieved.$createdAt).toISOString()).toBe(retrieved.$createdAt);
          expect(typeof retrieved.$updatedAt).toBe('string');
          expect(new Date(retrieved.$updatedAt).toISOString()).toBe(retrieved.$updatedAt);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// Property 3 — Partial update preserves unmodified fields
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 3: Partial update preserves unmodified fields
describe('Property 3 — Partial update preserves unmodified fields', () => {
  it('fields b and c are unchanged after updating only field a', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ a: fc.string(), b: fc.string(), c: fc.string() }),
        fc.record({ a: fc.string() }),
        async (baseDoc, updatePayload) => {
          const store: Store = new Map();
          wireStore(store);

          const createResult = await dbCreate('test_col', baseDoc);
          const docId = createResult.data!.$id;

          await dbUpdate('test_col', docId, updatePayload);

          const getResult = await dbGet('test_col', docId);
          const updated = getResult.data!;

          expect(updated.b).toBe(baseDoc.b);
          expect(updated.c).toBe(baseDoc.c);
          expect(updated.a).toBe(updatePayload.a);
        }
      ),
      { numRuns: 50 }
    );
  });
});

// =============================================================================
// Property 4 — Document normalisation invariant
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 4: Document normalisation invariant
describe('Property 4 — Document normalisation invariant', () => {
  it('$id === id and $createdAt/$updatedAt are valid ISO 8601 strings for any snapshot', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.integer({ min: 0, max: 2_000_000_000_000 }),
        fc.integer({ min: 0, max: 2_000_000_000_000 }),
        fc.record({ extra: fc.string() }),
        async (docId, ms1, ms2, extraFields) => {
          vi.clearAllMocks();

          docSpy.mockReturnValue({ _col: 'col', _id: docId });
          getDocSpy.mockResolvedValue({
            id: docId,
            exists: () => true,
            data: () => ({
              id: docId,
              created_at: MockTimestamp.fromMillis(ms1),
              updated_at: MockTimestamp.fromMillis(ms2),
              ...extraFields,
            }),
          });

          const result = await dbGet('col', docId);

          expect(result.error).toBeNull();
          const doc = result.data!;

          expect(doc.$id).toBe(docId);
          expect(doc.$id).toBe(doc.id);
          expect(new Date(doc.$createdAt).toISOString()).toBe(doc.$createdAt);
          expect(new Date(doc.$updatedAt).toISOString()).toBe(doc.$updatedAt);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// =============================================================================
// Property 6 — Pagination correctness
// =============================================================================
// Feature: supabase-to-firebase-migration, Property 6: Pagination correctness
describe('Property 6 — Pagination correctness', () => {
  it('returns exactly min(M, max(0, N-K)) docs with no overlap with first K doc IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 10, max: 50 }),  // N
          fc.integer({ min: 0,  max: 5  }),  // K  (offset)
          fc.integer({ min: 1,  max: 5  }),  // M  (limit)
        ),
        async ([N, K, M]) => {
          const store: Store = new Map();
          wireStore(store);

          const col = 'test_pagination';
          store.set(col, new Map());
          for (let i = 0; i < N; i++) {
            const id = `doc-${String(i).padStart(4, '0')}`;
            store.get(col)!.set(id, {
              id,
              seq: i,
              created_at: MockTimestamp.fromMillis(i * 1000),
              updated_at: MockTimestamp.fromMillis(i * 1000),
            });
          }

          const result = await dbList(col, [
            Query.offset(K),
            Query.limit(M),
          ]);

          const expectedLen = Math.min(M, Math.max(0, N - K));
          expect(result.data.length).toBe(expectedLen);

          const allDocIds = Array.from(store.get(col)!.keys()).sort();
          const skippedIds = new Set(allDocIds.slice(0, K));

          for (const d of result.data as any[]) {
            expect(skippedIds.has(d.id)).toBe(false);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
