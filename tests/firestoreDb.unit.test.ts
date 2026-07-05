// Feature: supabase-to-firebase-migration
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── All hoisted declarations must go through vi.hoisted ──────────────────────
// This ensures they are available when vi.mock factories run (which are hoisted
// to the top of the file at compile time by Vitest's transformer).
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

// ── Module mocks ─────────────────────────────────────────────────────────────
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

// Import after mocks are set up
import { dbCreate, dbGet, dbDelete, dbList, Query } from '../services/firestoreDb';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a fake DocumentSnapshot that "exists" with given data */
function fakeSnap(id: string, data: Record<string, any>) {
  return {
    id,
    exists: () => true,
    data: () => ({
      id,
      created_at: MockTimestamp.fromMillis(1_700_000_000_000),
      updated_at: MockTimestamp.fromMillis(1_700_000_001_000),
      ...data,
    }),
  };
}

/** Build a fake DocumentSnapshot that does NOT exist */
function missingSnap() {
  return {
    exists: () => false,
    data: () => undefined,
  };
}

// ── Mock setup per-test ───────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();

  docSpy.mockReturnValue({ _col: 'col', _id: 'id' });
  collectionSpy.mockReturnValue({ _col: 'col' });
  querySpy.mockImplementation((...args: any[]) => ({ _args: args }));
  whereSpy.mockImplementation((f: string, op: string, v: any) => ({ _where: { f, op, v } }));
  orderBySpy.mockImplementation((f: string, d: string) => ({ _orderBy: { f, d } }));
  limitSpy.mockImplementation((n: number) => ({ _limit: n }));
  startAfterSpy.mockImplementation((c: any) => ({ _startAfter: c }));
  writeBatchSpy.mockReturnValue({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. dbCreate with explicit ID
// ─────────────────────────────────────────────────────────────────────────────
describe('dbCreate with explicit ID', () => {
  it('calls setDoc with the provided ID and returns data with $id === providedId', async () => {
    const PROVIDED_ID = 'explicit-doc-id-123';
    const payload = { name: 'Supplier A', active: true };

    docSpy.mockReturnValue({ _col: 'suppliers', _id: PROVIDED_ID });
    setDocSpy.mockResolvedValue(undefined);
    getDocSpy.mockResolvedValue(fakeSnap(PROVIDED_ID, payload));

    const result = await dbCreate('suppliers', payload, PROVIDED_ID);

    expect(setDocSpy).toHaveBeenCalledOnce();
    const setDocPayload = setDocSpy.mock.calls[0][1] as Record<string, any>;
    expect(setDocPayload.id).toBe(PROVIDED_ID);

    expect(result.error).toBeNull();
    expect(result.data).not.toBeNull();
    expect(result.data!.$id).toBe(PROVIDED_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. dbCreate without ID — uses crypto.randomUUID
// ─────────────────────────────────────────────────────────────────────────────
describe('dbCreate without ID', () => {
  it('generates a UUID and returns data with $id === generated UUID', async () => {
    const GENERATED_UUID = 'aabbccdd-0000-0000-0000-001122334455';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(GENERATED_UUID as ReturnType<typeof crypto.randomUUID>);

    docSpy.mockReturnValue({ _col: 'suppliers', _id: GENERATED_UUID });
    setDocSpy.mockResolvedValue(undefined);
    getDocSpy.mockResolvedValue(fakeSnap(GENERATED_UUID, { name: 'Auto' }));

    const result = await dbCreate('suppliers', { name: 'Auto' });

    expect(result.error).toBeNull();
    expect(result.data!.$id).toBe(GENERATED_UUID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. dbGet on non-existent document
// ─────────────────────────────────────────────────────────────────────────────
describe('dbGet on non-existent document', () => {
  it('returns { data: null, error: null } when document does not exist', async () => {
    getDocSpy.mockResolvedValue(missingSnap());

    const result = await dbGet('suppliers', 'no-such-id');

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. dbDelete success shape
// ─────────────────────────────────────────────────────────────────────────────
describe('dbDelete success', () => {
  it('returns { success: true, error: null } when deleteDoc resolves', async () => {
    deleteDocSpy.mockResolvedValue(undefined);

    const result = await dbDelete('suppliers', 'some-id');

    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. dbList with array equal uses `in` constraint
// ─────────────────────────────────────────────────────────────────────────────
describe('dbList with array equal uses `in` constraint', () => {
  it('calls where with (field, "in", array) when Query.equal receives an array', async () => {
    getDocsSpy.mockResolvedValue({ size: 0, docs: [] });

    await dbList('suppliers', [Query.equal('status', ['a', 'b'])]);

    const inCall = whereSpy.mock.calls.find(
      ([, op]: [string, string]) => op === 'in'
    );
    expect(inCall).toBeDefined();
    expect(inCall![0]).toBe('status');
    expect(inCall![2]).toEqual(['a', 'b']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Firestore error returns standardised error envelope
// ─────────────────────────────────────────────────────────────────────────────
describe('Firestore error returns standardised error envelope', () => {
  it('dbGet returns { data: null, error: message } when getDoc throws', async () => {
    const errorMsg = 'permission denied';
    getDocSpy.mockRejectedValue(new Error(errorMsg));

    const result = await dbGet('suppliers', 'any-id');

    expect(result.data).toBeNull();
    expect(result.error).toBe(errorMsg);
  });
});
