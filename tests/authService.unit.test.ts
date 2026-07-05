// Feature: supabase-to-firebase-migration
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── All hoisted declarations through vi.hoisted ───────────────────────────────
const {
  signInWithEmailAndPasswordSpy,
  signOutSpy,
  createUserWithEmailAndPasswordSpy,
  sendPasswordResetEmailSpy,
  getAuthSpy,
  dbGetSpy,
  dbCreateSpy,
  dbUpdateSpy,
  dbListSpy,
  fakeFirebaseAuth,
} = vi.hoisted(() => ({
  signInWithEmailAndPasswordSpy:      vi.fn(),
  signOutSpy:                         vi.fn(),
  createUserWithEmailAndPasswordSpy:  vi.fn(),
  sendPasswordResetEmailSpy:          vi.fn(),
  getAuthSpy:                         vi.fn(),
  dbGetSpy:                           vi.fn(),
  dbCreateSpy:                        vi.fn(),
  dbUpdateSpy:                        vi.fn(),
  dbListSpy:                          vi.fn(),
  // Mutable fake auth object — tests set currentUser directly
  fakeFirebaseAuth: { currentUser: null as any },
}));

// ── Module mocks ─────────────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword:      signInWithEmailAndPasswordSpy,
  signOut:                         signOutSpy,
  createUserWithEmailAndPassword:  createUserWithEmailAndPasswordSpy,
  sendPasswordResetEmail:          sendPasswordResetEmailSpy,
  getAuth:                         getAuthSpy,
}));

vi.mock('../services/firebaseClient', () => ({
  firebaseAuth: fakeFirebaseAuth,
}));

vi.mock('../services/firestoreDb', () => ({
  dbGet:    dbGetSpy,
  dbCreate: dbCreateSpy,
  dbUpdate: dbUpdateSpy,
  dbList:   dbListSpy,
  COLLECTIONS: {
    USERS: 'users',
  },
  Query: {
    equal: (attr: string, val: any) =>
      JSON.stringify({ method: 'equal', attribute: attr, values: [val] }),
    limit: (n: number) =>
      JSON.stringify({ method: 'limit', values: [n] }),
  },
}));

import { authService } from '../services/authService';

// ── Reset between tests ───────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  fakeFirebaseAuth.currentUser = null;
  getAuthSpy.mockReturnValue(fakeFirebaseAuth);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. signIn success
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.signIn success', () => {
  it('returns AuthUser with id === uid when credentials are valid', async () => {
    signInWithEmailAndPasswordSpy.mockResolvedValue({ user: { uid: 'uid1' } });

    dbGetSpy.mockResolvedValue({
      data: {
        $id:   'uid1',
        id:    'uid1',
        email: 'user@example.com',
        name:  'Test User',
        role:  'OPERATOR',
      },
      error: null,
    });

    const result = await authService.signIn('user@example.com', 'correct-password');

    expect(result.id).toBe('uid1');
    expect(result.email).toBe('user@example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. signIn failure throws
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.signIn failure', () => {
  it('throws an Error with the Firebase message when credentials are invalid', async () => {
    signInWithEmailAndPasswordSpy.mockRejectedValue(new Error('wrong password'));

    await expect(
      authService.signIn('user@example.com', 'bad-password')
    ).rejects.toThrow('wrong password');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. signOut calls Firebase signOut
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.signOut', () => {
  it('calls Firebase signOut exactly once', async () => {
    signOutSpy.mockResolvedValue(undefined);

    await authService.signOut();

    expect(signOutSpy).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. getCurrentUser auto-creates profile when none exists
// ─────────────────────────────────────────────────────────────────────────────
describe('authService.getCurrentUser auto-creates profile', () => {
  it('auto-creates a Firestore profile with role OPERATOR when none exists', async () => {
    // Set a logged-in Firebase user
    fakeFirebaseAuth.currentUser = {
      uid:         'uid2',
      email:       'x@x.com',
      displayName: null,
    };

    // No profile by UID
    dbGetSpy.mockResolvedValue({ data: null, error: null });

    // No profile by email either
    dbListSpy.mockResolvedValue({ data: [], total: 0, error: null });

    // dbCreate succeeds
    dbCreateSpy.mockResolvedValue({ data: { $id: 'uid2' }, error: null });

    const result = await authService.getCurrentUser();

    // dbCreate must have been called once with users collection and uid2 as record ID
    expect(dbCreateSpy).toHaveBeenCalledOnce();
    const [collection, , recordId] = dbCreateSpy.mock.calls[0] as [string, any, string];
    expect(collection).toBe('users');
    expect(recordId).toBe('uid2');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('uid2');
    // UserRole.OPERATOR has the string value 'Operator'
    expect(result!.role).toBe('Operator');
  });
});
