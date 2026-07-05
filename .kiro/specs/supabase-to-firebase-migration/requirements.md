# Requirements Document

## Introduction

This feature migrates the Galaltix Commodity ERP application's backend from Supabase to Firebase. The application is a React/TypeScript commodity trading and export ERP system that currently uses Supabase for relational database storage (PostgreSQL via PostgREST), authentication, and a Vercel serverless function for admin user creation. The migration replaces all Supabase dependencies with equivalent Firebase services: Firestore for document storage, Firebase Authentication for identity management, and Firebase Admin SDK for privileged server-side operations. The application must continue to function without interruption for all existing features including procurement, sales, inventory, quality control, accounting, compliance, shipment management, and document management.

## Glossary

- **Firebase_Client**: The Firebase JavaScript SDK (`firebase` npm package) used in the React frontend.
- **Firebase_Admin**: The Firebase Admin SDK used in Vercel serverless functions for privileged operations.
- **Firestore**: Firebase's NoSQL document database that replaces the Supabase PostgreSQL backend.
- **Firebase_Auth**: Firebase Authentication service that replaces Supabase Auth.
- **FirestoreDb**: The abstraction layer (replacing `supabaseDb.ts`) that provides `dbList`, `dbGet`, `dbCreate`, `dbUpdate`, `dbDelete`, and `Query` to all service files.
- **AuthService**: The `services/authService.ts` module responsible for sign-in, sign-up, sign-out, and session management.
- **CreateUser_Function**: The Vercel serverless function at `api/createUser.js` that creates users with admin privileges.
- **COLLECTIONS**: The constant map of Firestore collection names used by all service files.
- **Query**: The query builder utility consumed by all service files to construct filtered, ordered, and paginated data queries.
- **AuthContext**: The React context at `context/AuthContext.tsx` that provides the authenticated user state to all components.
- **CacheManager**: The `utils/cacheManager.ts` utility that manages local browser cache clearing, including preservation of authentication tokens.
- **ERP_System**: The full Galaltix Commodity ERP application.

---

## Requirements

### Requirement 1: Firebase SDK Installation and Configuration

**User Story:** As a developer, I want Firebase SDKs configured in the project, so that all parts of the application can connect to Firebase services.

#### Acceptance Criteria

1. THE ERP_System SHALL include the `firebase` npm package as a production dependency with a pinned version.
2. THE ERP_System SHALL include the `firebase-admin` npm package as a production dependency with a pinned version for use in Vercel serverless functions.
3. THE Firebase_Client SHALL be initialised using environment variables `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.
4. THE ERP_System SHALL export a singleton `firebaseApp`, `firestoreDb`, and `firebaseAuth` instance from a dedicated `services/firebaseClient.ts` module.
5. IF any required Firebase environment variable is missing at initialisation time, THEN THE Firebase_Client SHALL log a descriptive error and throw an exception to prevent silent misconfiguration.
6. THE ERP_System SHALL remove the `@supabase/supabase-js` package from `package.json` dependencies after the migration is complete.

---

### Requirement 2: Firestore Database Abstraction Layer

**User Story:** As a developer, I want a Firestore-backed database abstraction that exposes the same API as the current `supabaseDb.ts`, so that all existing service files require only an import path change and no logic rewrites.

#### Acceptance Criteria

1. THE FirestoreDb SHALL export `dbList`, `dbGet`, `dbCreate`, `dbUpdate`, `dbDelete`, `dbCreateBulk`, `COLLECTIONS`, `ID`, and `Query` with identical TypeScript signatures to those in `services/supabaseDb.ts`.
2. WHEN `dbList` is called with filter `Query` objects, THE FirestoreDb SHALL apply equivalent Firestore `where`, `orderBy`, `limit`, and `startAfter` constraints to the Firestore collection query.
3. WHEN `dbCreate` is called with an optional `recordId`, THE FirestoreDb SHALL use that value as the Firestore document ID; WHEN no `recordId` is provided, THE FirestoreDb SHALL generate a UUID via `crypto.randomUUID()`.
4. WHEN `dbGet` is called with a `recordId`, THE FirestoreDb SHALL retrieve the Firestore document by its document ID and return `null` when the document does not exist.
5. WHEN `dbUpdate` is called, THE FirestoreDb SHALL perform a Firestore `update` (partial update, not overwrite) on the target document.
6. WHEN `dbDelete` is called, THE FirestoreDb SHALL delete the target Firestore document and return `{ success: true, error: null }` on success.
7. THE FirestoreDb SHALL normalise every retrieved document to include `$id`, `$createdAt`, and `$updatedAt` aliases matching the `id`, `created_at`, and `updated_at` fields respectively, preserving compatibility with all service files.
8. WHEN a Firestore operation fails, THE FirestoreDb SHALL return the standardised `{ data: null, error: string }` or `{ data: [], total: 0, error: string }` shape and SHALL log the error with the collection name and operation type.
9. THE FirestoreDb SHALL be implemented in a new file `services/firestoreDb.ts` and SHALL replace all imports of `services/supabaseDb` across the codebase.
10. THE COLLECTIONS constant in `services/firestoreDb.ts` SHALL include all collection keys present in the current `services/supabaseDb.ts` COLLECTIONS object.

---

### Requirement 3: Query Builder Compatibility

**User Story:** As a developer, I want the `Query` builder in the new Firestore abstraction to support all operators currently used by service files, so that no service file query logic needs to change.

#### Acceptance Criteria

1. THE Query builder SHALL support `equal`, `notEqual`, `greaterThan`, `greaterThanEqual`, `lessThan`, `lessThanEqual`, `search`, `orderAsc`, `orderDesc`, `limit`, and `offset` methods with the same signatures as in `services/supabaseDb.ts`.
2. WHEN `Query.equal` is called with an array of values, THE FirestoreDb SHALL apply a Firestore `in` constraint.
3. WHEN `Query.search` is called, THE FirestoreDb SHALL perform a case-insensitive prefix or contains search on the specified field using Firestore's available query capabilities or client-side filtering as a fallback.
4. WHEN `Query.offset` is called with a value greater than zero, THE FirestoreDb SHALL implement pagination using Firestore cursor-based pagination (`startAfter`) so that the correct page of results is returned.
5. WHEN both `orderAsc`/`orderDesc` and `where` constraints are combined, THE FirestoreDb SHALL create the required Firestore composite index configuration and SHALL document the required index definitions.

---

### Requirement 4: Firebase Authentication — Client-Side

**User Story:** As a user, I want to sign in, sign out, and have my session persisted across page reloads, so that I can use the ERP without re-authenticating on every visit.

#### Acceptance Criteria

1. WHEN `authService.signIn` is called with a valid email and password, THE AuthService SHALL call `signInWithEmailAndPassword` from Firebase Auth and return an `AuthUser` object.
2. WHEN `authService.signIn` is called with an invalid email or password, THE AuthService SHALL throw an `Error` with the Firebase Auth error message.
3. WHEN `authService.signOut` is called, THE AuthService SHALL call `signOut` from Firebase Auth and clear the local session.
4. WHEN `authService.getCurrentUser` is called, THE AuthService SHALL use `onAuthStateChanged` or `getAuth().currentUser` to retrieve the currently authenticated Firebase user, then look up the corresponding profile document in the Firestore `users` collection.
5. IF no Firestore user profile document exists for an authenticated Firebase user, THEN THE AuthService SHALL auto-create a profile document in the `users` Firestore collection with role `OPERATOR`, preserving the existing auto-create behaviour for the primary admin email.
6. THE AuthService SHALL NOT call any Supabase Auth methods after migration.
7. WHEN `authService.signUp` is called, THE AuthService SHALL call `createUserWithEmailAndPassword` from Firebase Auth and create a corresponding profile document in the Firestore `users` collection.

---

### Requirement 5: Firebase Authentication — Server-Side Admin User Creation

**User Story:** As an admin user, I want to create new user accounts from the User Management screen, so that new staff can access the ERP.

#### Acceptance Criteria

1. THE CreateUser_Function SHALL be rewritten to use the Firebase Admin SDK (`firebase-admin`) instead of the Supabase Admin client.
2. THE CreateUser_Function SHALL initialise `firebase-admin` using environment variables `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` (service account credentials).
3. WHEN a POST request is received by the CreateUser_Function, THE CreateUser_Function SHALL verify the caller's identity by validating the Bearer token in the `Authorization` header using `admin.auth().verifyIdToken()`.
4. WHEN the caller's role in Firestore is not one of `['Super Admin', 'Admin', 'Manager']`, THEN THE CreateUser_Function SHALL return HTTP 403 with a descriptive error message.
5. WHEN the caller is authorised, THE CreateUser_Function SHALL create the Firebase Auth user via `admin.auth().createUser()` with email confirmation set to `true`.
6. WHEN the Firebase Auth user is created successfully, THE CreateUser_Function SHALL upsert the user profile document in the Firestore `users` collection with the provided `name`, `role`, `location`, and `is_active: true` fields.
7. IF the Firestore profile write fails after Auth user creation, THEN THE CreateUser_Function SHALL log the error and return HTTP 500 with an error message describing the partial failure.
8. WHEN the caller's Firebase ID token is invalid or expired, THEN THE CreateUser_Function SHALL return HTTP 401.

---

### Requirement 6: AuthContext Session Management

**User Story:** As a user, I want the application to detect my login state automatically on page load, so that I am not unexpectedly signed out.

#### Acceptance Criteria

1. THE AuthContext SHALL subscribe to Firebase Auth's `onAuthStateChanged` listener in its `useEffect` hook to receive real-time authentication state changes.
2. WHEN the Firebase Auth state changes to a signed-in user, THE AuthContext SHALL call `authService.getCurrentUser()` to load the full `AuthUser` profile and update the `user` state.
3. WHEN the Firebase Auth state changes to `null` (signed out), THE AuthContext SHALL set `user` to `null`.
4. THE AuthContext SHALL set `loading` to `false` only after the initial `onAuthStateChanged` event has been received, preventing a flash of the sign-in screen on valid sessions.
5. WHEN the AuthContext component unmounts, THE AuthContext SHALL unsubscribe from the `onAuthStateChanged` listener to prevent memory leaks.

---

### Requirement 7: Cache Manager Token Key Update

**User Story:** As a developer, I want the CacheManager to preserve Firebase Auth session tokens, so that automatic cache clearing does not sign users out.

#### Acceptance Criteria

1. THE CacheManager SHALL include the Firebase Auth local persistence key pattern `firebase:authUser:*` in its `essentialKeys` list.
2. THE CacheManager SHALL remove the Supabase-specific key patterns (`sb-hzigzdwxwtykjqypkiln-auth-token`, `galaltix-auth-token`) from its `essentialKeys` list.
3. WHEN `clearLocalStorage` is called, THE CacheManager SHALL preserve all `localStorage` keys that match the Firebase Auth pattern and SHALL clear all non-essential keys.

---

### Requirement 8: Data Model Mapping — Relational to Document

**User Story:** As a developer, I want a clear mapping from the existing PostgreSQL schema to Firestore collections, so that all data can be migrated and queried correctly.

#### Acceptance Criteria

1. THE ERP_System SHALL represent each SQL table in `schema_commodity_erp.sql` as a top-level Firestore collection with the same name as the value in the `COLLECTIONS` constant.
2. THE ERP_System SHALL store all JSONB columns (e.g., `address`, `bank_details`, `quality_parameters`, `packaging_info`) as nested Firestore map fields within the document.
3. THE ERP_System SHALL store UUID foreign key references as plain string fields within Firestore documents; referential integrity checks SHALL be enforced in service-layer code rather than by the database.
4. THE ERP_System SHALL store `TIMESTAMPTZ` fields as Firestore `Timestamp` objects and SHALL convert them to ISO 8601 strings when mapping to the `$createdAt` and `$updatedAt` aliases.
5. THE ERP_System SHALL store array columns (e.g., `container_numbers TEXT[]` in the `shipments` table) as Firestore array fields.
6. WHERE the existing SQL schema uses stored procedures for sequence generation (e.g., `generate_batch_number`), THE ERP_System SHALL implement equivalent logic in the relevant TypeScript service or utility function.

---

### Requirement 9: Data Migration

**User Story:** As a system operator, I want existing Supabase data migrated to Firestore, so that no operational data is lost during the transition.

#### Acceptance Criteria

1. THE ERP_System SHALL include a standalone migration script that reads all rows from each Supabase table and writes equivalent documents to the corresponding Firestore collection.
2. WHEN migrating a row, THE migration script SHALL map all column values to Firestore field names, converting `UUID` primary keys to document IDs and converting `TIMESTAMPTZ` values to Firestore `Timestamp` objects.
3. WHEN the migration script encounters a row with a `NULL` foreign key reference, THE migration script SHALL write the field as `null` in Firestore rather than omitting the field.
4. THE migration script SHALL log the number of records migrated per collection and SHALL log any individual document write failures without aborting the full migration.
5. WHEN re-run, THE migration script SHALL upsert documents (not duplicate them) using the original `id` as the Firestore document ID.

---

### Requirement 10: Firestore Security Rules

**User Story:** As a security-conscious operator, I want Firestore security rules that restrict data access to authenticated users, so that unauthenticated requests cannot read or write ERP data.

#### Acceptance Criteria

1. THE ERP_System SHALL include a `firestore.rules` file in the project root defining Firestore security rules.
2. WHILE a user is not authenticated, THE Firestore security rules SHALL deny all read and write access to every collection.
3. WHILE a user is authenticated, THE Firestore security rules SHALL allow read and write access to all collections for the initial deployment phase, matching the current Supabase development policy.
4. THE `firestore.rules` file SHALL include comments noting that production rules should be tightened to restrict access by `company_id` and user role.

---

### Requirement 11: Environment Variable and Deployment Configuration

**User Story:** As a DevOps engineer, I want the Vercel deployment configured with Firebase environment variables, so that the production application connects to Firebase correctly.

#### Acceptance Criteria

1. THE ERP_System's `DEPLOYMENT.md` SHALL document all required Firebase environment variables for both the Vite frontend (`VITE_FIREBASE_*`) and the Vercel serverless functions (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
2. THE ERP_System SHALL remove all references to `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from `DEPLOYMENT.md` and from all serverless function files.
3. THE ERP_System's `.gitignore` SHALL ensure that Firebase service account credential files (e.g., `serviceAccountKey.json`) are never committed to version control.

---

### Requirement 12: Keep-Alive Cron Job Compatibility

**User Story:** As a DevOps engineer, I want the Vercel keep-alive cron job to continue functioning after migration, so that the application remains warm and responsive.

#### Acceptance Criteria

1. THE ERP_System SHALL retain the `api/cron/keep-alive.js` function and its schedule in `vercel.json` unchanged, as this function has no Supabase dependency.
2. IF the keep-alive function currently pings a Supabase URL, THEN THE ERP_System SHALL update the ping target to a Firebase-compatible health endpoint or remove the Supabase ping.

---

### Requirement 13: Regression — All Existing ERP Features Remain Functional

**User Story:** As an ERP user, I want all existing features to work identically after the migration, so that the migration is invisible from a business operations perspective.

#### Acceptance Criteria

1. THE ERP_System SHALL allow authenticated users to perform all CRUD operations across all modules (suppliers, buyers, commodity batches, purchase contracts, sales contracts, shipments, quality tests, processing orders, accounting entries, exchange rates, compliance records, documents, and invoices) using the Firestore-backed service layer.
2. WHEN a service file calls `dbList`, `dbGet`, `dbCreate`, `dbUpdate`, or `dbDelete`, THE FirestoreDb SHALL return data in the same shape as the previous Supabase implementation, including `$id`, `$createdAt`, and `$updatedAt` aliases.
3. THE ERP_System's build (`npm run build`) SHALL complete without TypeScript errors after migration.
4. THE offline and cache management utilities SHALL function correctly with Firebase Auth session tokens preserved across automatic cache-clearing cycles.
