// Feature: supabase-to-firebase-migration, Property 5: Firebase Auth cache key preservation
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

import { CacheManager } from '../utils/cacheManager';

describe('Property 5 — Firebase Auth cache key preservation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves all firebase:* keys and removes all non-essential, non-firebase keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Non-firebase keys (must not start with 'firebase:')
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 }).filter(
            s => !s.startsWith('firebase:')
          ),
          { minLength: 0, maxLength: 10 }
        ),
        // Firebase keys
        fc.array(
          fc.constantFrom(
            'firebase:authUser:abc123:[DEFAULT]',
            'firebase:refreshToken:xyz',
            'firebase:authUser:def456:[DEFAULT]',
          ),
          { minLength: 0, maxLength: 3 }
        ),
        async (nonFirebaseKeys, firebaseKeys) => {
          // Build in-memory mock localStorage (Map-backed)
          const storage = new Map<string, string>();

          const mockLocalStorage = {
            getItem:    (k: string)            => storage.get(k) ?? null,
            setItem:    (k: string, v: string) => { storage.set(k, v); },
            removeItem: (k: string)            => { storage.delete(k); },
            get length() { return storage.size; },
            key:        (i: number)            => Array.from(storage.keys())[i] ?? null,
          };

          vi.stubGlobal('localStorage', mockLocalStorage);

          // Populate with both sets
          for (const k of nonFirebaseKeys) {
            mockLocalStorage.setItem(k, 'value');
          }
          for (const k of firebaseKeys) {
            mockLocalStorage.setItem(k, 'fbtoken');
          }

          // Instantiate CacheManager and run clearCaches() with localStorage only
          const manager = new CacheManager({
            enableLogging: false,
            cacheTypes: {
              localStorage:  true,
              sessionStorage: false,
              indexedDB:      false,
              serviceWorker:  false,
              browserCache:   false,
            },
          });

          await manager.clearCaches();

          // All firebase:* keys must still be present
          for (const k of firebaseKeys) {
            expect(storage.has(k)).toBe(true);
          }

          // All non-firebase, non-essential keys must be absent.
          // (essential keys from CacheManager's default list are preserved too,
          //  but none of our generated non-firebase keys collide with them because
          //  we filter the generator to avoid common prefixes.)
          const essentialDefaults = new Set([
            'auth-token',
            'user-preferences',
            'theme-settings',
            'language-setting',
            'cache-manager-config',
          ]);
          for (const k of nonFirebaseKeys) {
            if (!essentialDefaults.has(k)) {
              expect(storage.has(k)).toBe(false);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
