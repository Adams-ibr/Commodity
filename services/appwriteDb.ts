// =====================================================
// APPWRITE DATABASE HELPER
// =====================================================
// Thin wrapper around Appwrite Databases SDK providing
// a consistent API surface for all service files.

import { databases, ID, Query } from './appwriteClient';
import { DATABASE_ID } from './appwriteConfig';

export { Query, ID };

export interface DbResponse<T> {
    data: T | null;
    error: string | null;
}

export interface DbListResponse<T> {
    data: T[];
    total: number;
    error: string | null;
}

/**
 * List documents from a collection with optional queries.
 */
export async function dbList<T = any>(
    collectionId: string,
    queries: string[] = []
): Promise<DbListResponse<T>> {
    try {
        const res = await databases.listDocuments(DATABASE_ID, collectionId, queries);
        return {
            data: res.documents as unknown as T[],
            total: res.total,
            error: null,
        };
    } catch (err: any) {
        console.error(`[dbList] ${collectionId}:`, err.message || err);
        return { data: [], total: 0, error: err.message || 'Unknown error' };
    }
}

/**
 * Get a single document by ID.
 */
export async function dbGet<T = any>(
    collectionId: string,
    documentId: string
): Promise<DbResponse<T>> {
    try {
        const doc = await databases.getDocument(DATABASE_ID, collectionId, documentId);
        return { data: doc as unknown as T, error: null };
    } catch (err: any) {
        console.error(`[dbGet] ${collectionId}/${documentId}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

/**
 * Create a new document. Pass a custom ID or use ID.unique().
 */
export async function dbCreate<T = any>(
    collectionId: string,
    data: Record<string, any>,
    documentId?: string
): Promise<DbResponse<T>> {
    try {
        const doc = await databases.createDocument(
            DATABASE_ID,
            collectionId,
            documentId || ID.unique(),
            data
        );
        return { data: doc as unknown as T, error: null };
    } catch (err: any) {
        console.error(`[dbCreate] ${collectionId}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

/**
 * Update an existing document by ID.
 */
export async function dbUpdate<T = any>(
    collectionId: string,
    documentId: string,
    data: Record<string, any>
): Promise<DbResponse<T>> {
    try {
        const doc = await databases.updateDocument(DATABASE_ID, collectionId, documentId, data);
        return { data: doc as unknown as T, error: null };
    } catch (err: any) {
        console.error(`[dbUpdate] ${collectionId}/${documentId}:`, err.message || err);
        return { data: null, error: err.message || 'Unknown error' };
    }
}

/**
 * Delete a document by ID.
 */
export async function dbDelete(
    collectionId: string,
    documentId: string
): Promise<{ success: boolean; error: string | null }> {
    try {
        await databases.deleteDocument(DATABASE_ID, collectionId, documentId);
        return { success: true, error: null };
    } catch (err: any) {
        console.error(`[dbDelete] ${collectionId}/${documentId}:`, err.message || err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}
