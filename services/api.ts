import { supabase } from './supabaseClient';
import { InventoryItem, Transaction, AuditLogEntry, ProductType, TransactionType, UserRole } from '../types';

// Inventory Service
export const api = {
    inventory: {
        async getAll(): Promise<InventoryItem[]> {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*');

            if (error || !data) {
                console.error('Error fetching inventory:', error);
                return [];
            }
            return data.map((item: any) => ({
                id: item.id,
                location: item.location,
                product: item.product as ProductType,
                currentVolume: Number(item.current_volume),
                maxCapacity: Number(item.max_capacity),
                minThreshold: Number(item.min_threshold),
                lastUpdated: item.last_updated,
                status: item.status
            }));
        },

        async create(item: InventoryItem): Promise<InventoryItem | null> {
            const { data, error } = await supabase
                .from('inventory_items')
                .insert([{
                    location: item.location,
                    product: item.product,
                    current_volume: item.currentVolume,
                    max_capacity: item.maxCapacity,
                    min_threshold: item.minThreshold,
                    status: item.status
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating item:', error);
                return null;
            }
            return { ...item, id: data.id };
        },

        async update(item: InventoryItem): Promise<boolean> {
            const { error } = await supabase
                .from('inventory_items')
                .update({
                    current_volume: item.currentVolume,
                    status: item.status,
                    max_capacity: item.maxCapacity,
                    last_updated: new Date().toISOString()
                })
                .eq('id', item.id);

            if (error) {
                console.error('Error updating item:', error);
                return false;
            }
            return true;
        }
    },

    transactions: {
        async create(tx: any): Promise<Transaction | null> {
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    type: tx.type,
                    product: tx.product,
                    volume: tx.volume,
                    source_id: tx.sourceId ? tx.sourceId : null,
                    destination: tx.destination,
                    customer_id: tx.customerId,
                    customer_name: tx.customerName,
                    reference_doc: tx.refDoc,
                    performed_by: tx.performedBy,
                    status: tx.status
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating transaction:', error);
                return null;
            }

            return {
                id: data.id,
                type: data.type as TransactionType,
                product: data.product as ProductType,
                volume: Number(data.volume),
                source: data.source_id,
                destination: data.destination,
                timestamp: data.created_at,
                performedBy: data.performed_by,
                referenceDoc: data.reference_doc,
                status: data.status,
                customerId: data.customer_id,
                customerName: data.customer_name
            };
        },

        async getAll(): Promise<Transaction[]> {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data) return [];

            return data.map((t: any) => ({
                id: t.id,
                type: t.type,
                product: t.product,
                volume: Number(t.volume),
                source: t.source_id,
                destination: t.destination,
                timestamp: t.created_at,
                performedBy: t.performed_by,
                referenceDoc: t.reference_doc,
                status: t.status,
                customerId: t.customer_id,
                customerName: t.customer_name
            }));
        }
    },

    audit: {
        async log(action: string, details: string, user: string, role: string) {
            await supabase.from('audit_logs').insert([{
                action,
                details,
                user_id: user,
                user_role: role,
                ip_hash: '127.0.0.1' // Placeholder
            }]);
        },

        async getAll(): Promise<AuditLogEntry[]> {
            const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
            if (error || !data) return [];
            return data.map((l: any) => ({
                id: l.id,
                timestamp: l.created_at,
                action: l.action,
                details: l.details,
                user: l.user_id,
                role: l.user_role as UserRole,
                ipHash: l.ip_hash
            }));
        }
    }
};
