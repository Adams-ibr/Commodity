# Tasks

## Task List

- [x] 1 Install Firebase dependencies and remove Supabase
  - [x] 1.1 Add `firebase` (pinned version) and `firebase-admin` (pinned version) to `package.json` dependencies
  - [x] 1.2 Remove `@supabase/supabase-js` from `package.json` dependencies
  - [x] 1.3 Run `npm install` to update `package-lock.json`

- [x] 2 Create `services/firebaseClient.ts`
  - [x] 2.1 Implement singleton Firebase app initialisation using `getApps()` guard
  - [x] 2.2 Export `firebaseApp`, `firestoreDb`, and `firebaseAuth` instances
  - [x] 2.3 Validate all six `VITE_FIREBASE_*` environment variables at init time; log descriptive error and throw if any are missing

- [x] 3 Create `services/firestoreDb.ts` (drop-in replacement for `supabaseDb.ts`)
  - [x] 3.1 Copy `COLLECTIONS`, `ID`, and `Query` exports from `supabaseDb.ts` — keep identical signatures
  - [x] 3.2 Implement `normalizeDoc` helper that maps `id`, `created_at`, `updated_at` to `$id`, `$createdAt`, `$updatedAt`
  - [x] 3.3 Implement `dbGet` using Firestore `getDoc`; return `{ data: null, error: null }` when document does not exist
  - [x] 3.4 Implement `dbCreate` using Firestore `setDoc`; use provided `recordId` as document ID or generate UUID via `crypto.randomUUID()`
  - [x] 3.5 Implement `dbUpdate` using Firestore `updateDoc` (partial update, not overwrite)
  - [x] 3.6 Implement `dbDelete` using Firestore `deleteDoc`; return `{ success: true, error: null }` on success
  - [x] 3.7 Implement `dbCreateBulk` using Firestore `WriteBatch`
  - [x] 3.8 Implement `dbList` with Query decoding: translate `equal`, `notEqual`, `greaterThan`, `greaterThanEqual`, `lessThan`, `lessThanEqual`, `search`, `orderAsc`, `orderDesc`, `limit`, and `offset` to Firestore constraints
  - [x] 3.9 Implement `offset` emulation via cursor-based pagination (`startAfter`) in `dbList`
  - [x] 3.10 Wrap all operations in try/catch; return standardised error envelopes and log errors with collection name and operation type

- [x] 4 Update all service file imports from `supabaseDb` to `firestoreDb`
  - [x] 4.1 Update import in `services/authService.ts`
  - [x] 4.2 Update imports across all other service files (`accountingService.ts`, `salesService.ts`, `procurementService.ts`, `commodityMasterService.ts`, `ingestionService.ts`, `advancedIngestionService.ts`, `complianceService.ts`, `documentService.ts`, `fxService.ts`, `invoiceService.ts`, `notificationService.ts`, `processingService.ts`, `procurementUtils.ts`, `qualityControlService.ts`, `reportingService.ts`, `tradeFinanceService.ts`, `warehouseService.ts`)

- [x] 5 Rewrite `services/authService.ts` to use Firebase Auth
  - [x] 5.1 Replace `signIn` to use `signInWithEmailAndPassword` from Firebase Auth
  - [x] 5.2 Replace `signOut` to use `signOut` from Firebase Auth
  - [x] 5.3 Replace `signUp` to use `createUserWithEmailAndPassword` and create Firestore profile document
  - [x] 5.4 Replace `getCurrentUser` to read `getAuth().currentUser` then look up Firestore `users` profile by UID; auto-create profile with role `OPERATOR` if none exists
  - [x] 5.5 Remove `resetUserPassword` method (relies on Supabase Admin — replaced by Firebase console email reset flow) or implement via Firebase Auth `sendPasswordResetEmail`
  - [x] 5.6 Remove all imports from `supabaseClient.ts`

- [x] 6 Rewrite `context/AuthContext.tsx` to use `onAuthStateChanged`
  - [x] 6.1 Replace `checkSession()` polling with `onAuthStateChanged(firebaseAuth, handler)` subscription in `useEffect`
  - [x] 6.2 Set `loading = false` only after the first `onAuthStateChanged` event is received
  - [x] 6.3 Return the unsubscribe function from `useEffect` cleanup to prevent memory leaks

- [x] 7 Rewrite `api/createUser.js` to use Firebase Admin SDK
  - [x] 7.1 Replace Supabase Admin client initialisation with `firebase-admin` initialisation using `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` env vars; guard against double-init with `getApps()`
  - [x] 7.2 Replace `supabaseAdmin.auth.getUser(token)` with `admin.auth().verifyIdToken(token)`
  - [x] 7.3 Replace Supabase `from('users').select('role')` lookup with Firestore `adminDb.collection('users').doc(uid).get()`
  - [x] 7.4 Replace `supabaseAdmin.auth.admin.createUser` with `admin.auth().createUser({ email, password, emailVerified: true, displayName: name })`
  - [x] 7.5 Replace Supabase `from('users').upsert(...)` with Firestore `adminDb.collection('users').doc(uid).set({...}, { merge: true })`
  - [x] 7.6 Remove all `@supabase/supabase-js` imports; remove references to `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

- [x] 8 Update `api/cron/keep-alive.js`
  - [x] 8.1 Replace Supabase client with Firebase Admin SDK initialisation (reuse pattern from `createUser.js`)
  - [x] 8.2 Replace Supabase `from('users').select('id').limit(1)` with `adminDb.collection('users').limit(1).get()`
  - [x] 8.3 Remove `@supabase/supabase-js` import and Supabase env var references

- [x] 9 Update `utils/cacheManager.ts` for Firebase Auth token preservation
  - [x] 9.1 Remove `'sb-hzigzdwxwtykjqypkiln-auth-token'` and `'galaltix-auth-token'` from `essentialKeys`
  - [x] 9.2 Add an `isEssentialKey(key: string): boolean` helper that returns `true` for keys starting with `'firebase:authUser:'` or `'firebase:'`
  - [x] 9.3 Update `clearLocalStorage` to call `isEssentialKey` instead of a plain array `includes` check

- [x] 10 Create `firestore.rules`
  - [x] 10.1 Create `firestore.rules` in the project root with an authenticated-user allow-all rule
  - [x] 10.2 Add comments noting that production rules should restrict by `company_id` and user role

- [x] 11 Create `firestore.indexes.json`
  - [x] 11.1 Define composite indexes for the query patterns listed in the design document (`commodity_batches`, `purchase_contracts`, `sales_contracts`, `shipments`, `audit_logs`, `journal_entry_lines`, `invoices`)

- [x] 12 Create migration script `scripts/migrate-supabase-to-firestore.ts`
  - [x] 12.1 Implement Supabase reader using the Supabase JS client with service role key to fetch all rows per collection in batches of 1,000
  - [x] 12.2 Implement row-to-document mapping: UUID primary key → document ID, `TIMESTAMPTZ` → Firestore `Timestamp`, JSONB → nested map, `TEXT[]` → Firestore array, `NULL` FK → `null` field (not omitted)
  - [x] 12.3 Implement Firestore writer using `WriteBatch` with `set(..., { merge: true })` for upsert semantics
  - [x] 12.4 Log per-collection record count and individual document write failures; do not abort the full migration on single-document failures
  - [x] 12.5 Add the script as a `npm run migrate` entry in `package.json` scripts

- [x] 13 Update `DEPLOYMENT.md` and environment configuration
  - [x] 13.1 Document all required `VITE_FIREBASE_*` frontend environment variables
  - [x] 13.2 Document `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` for Vercel serverless functions
  - [x] 13.3 Remove all references to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
  - [x] 13.4 Add `serviceAccountKey.json` to `.gitignore` if not already present

- [x] 14 Delete obsolete Supabase files
  - [x] 14.1 Delete `services/supabaseClient.ts`
  - [x] 14.2 Delete `services/supabaseDb.ts`

- [x] 15 Write property-based and unit tests
  - [x] 15.1 Set up `fast-check` as a dev dependency
  - [x] 15.2 Write unit tests for `firestoreDb.ts` (mock Firestore SDK): `dbCreate` with explicit ID, `dbCreate` without ID generates UUID, `dbGet` on non-existent ID, `dbDelete` success shape, `dbList` with array `equal` uses `in` constraint, Firestore error returns standardised error envelope
  - [x] 15.3 Write property test for **Property 1 — Query constraint fidelity**: generate random Query combinations and verify Firestore constraint mapping
  - [x] 15.4 Write property test for **Property 2 — Create-then-get round-trip**: generate random document data, create then retrieve, verify deep equality plus aliases
  - [x] 15.5 Write property test for **Property 3 — Partial update preserves unmodified fields**: generate random documents and random update subsets, verify non-updated fields unchanged
  - [x] 15.6 Write property test for **Property 4 — Document normalisation invariant**: generate random Firestore DocumentSnapshot data, verify `$id`, `$createdAt`, `$updatedAt` invariants
  - [x] 15.7 Write property test for **Property 5 — Firebase Auth cache key preservation**: generate random localStorage key sets, verify Firebase Auth keys survive `clearLocalStorage`
  - [x] 15.8 Write property test for **Property 6 — Pagination correctness**: seed mock Firestore with N docs, verify offset/limit returns correct non-overlapping slice
  - [x] 15.9 Write property test for **Property 7 — Migration mapping correctness**: generate random Supabase row objects, verify mapping function output shape
  - [x] 15.10 Write property test for **Property 8 — Migration idempotency**: run mapping + upsert twice, verify document count and data unchanged
  - [x] 15.11 Write unit tests for `authService.ts` (mock Firebase Auth + firestoreDb): signIn success, signIn failure throws, signOut calls Firebase, getCurrentUser auto-creates profile
  - [x] 15.12 Write unit tests for `AuthContext.tsx`: loading state transitions, null auth state sets user to null, unmount triggers unsubscribe

- [x] 16 Verify build passes
  - [x] 16.1 Run `npm run build` and confirm zero TypeScript errors
  - [x] 16.2 Fix any type errors introduced by the migration
