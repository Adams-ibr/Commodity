// Feature: supabase-to-firebase-migration
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── Use vi.hoisted so spy references are available inside vi.mock factories ───
const { onAuthStateChangedSpy, unsubscribeSpy, getCurrentUserSpy } = vi.hoisted(() => ({
  onAuthStateChangedSpy: vi.fn(),
  unsubscribeSpy:        vi.fn(),
  getCurrentUserSpy:     vi.fn(),
}));

// ── Module mocks ─────────────────────────────────────────────────────────────
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: onAuthStateChangedSpy,
}));

vi.mock('../services/firebaseClient', () => ({
  firebaseAuth: { _fake: true },
}));

vi.mock('../services/authService', () => ({
  authService: {
    getCurrentUser: getCurrentUserSpy,
  },
}));

import { AuthProvider, useAuth } from '../context/AuthContext';

// ── Helper wrapper ────────────────────────────────────────────────────────────
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// Track the captured callback between tests
let capturedCallback: ((user: any) => void) | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  capturedCallback = null;

  onAuthStateChangedSpy.mockImplementation((_auth: any, cb: (user: any) => void) => {
    capturedCallback = cb;
    return unsubscribeSpy;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. loading state transitions
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthContext loading state', () => {
  it('is true before onAuthStateChanged fires and false after it fires', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Before the callback fires, loading should be true
    expect(result.current.loading).toBe(true);

    // Fire the callback with null (signed out)
    await act(async () => {
      capturedCallback!(null);
    });

    expect(result.current.loading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. null auth state sets user to null
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthContext null auth state', () => {
  it('sets user to null and loading to false after onAuthStateChanged fires with null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      capturedCallback!(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. unmount triggers unsubscribe
// ─────────────────────────────────────────────────────────────────────────────
describe('AuthContext unmount', () => {
  it('calls the unsubscribe function returned by onAuthStateChanged on unmount', () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledOnce();
  });
});
