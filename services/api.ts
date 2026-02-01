import { supabase } from './supabaseClient';
import { InventoryItem, Transaction, AuditLogEntry, ProductType, TransactionType, UserRole, Customer, CustomerType, Price } from '../types';

// Location type for API
export interface Location {
    id: string;
    name: string;
    type: 'Depot' | 'Station';
    address?: string;
    isActive: boolean;
    createdAt: string;
}

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
    },

    locations: {
        async getAll(): Promise<Location[]> {
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .order('name');

            if (error || !data) {
                console.error('Error fetching locations:', error);
                return [];
            }
            return data.map((l: any) => ({
                id: l.id,
                name: l.name,
                type: l.type,
                address: l.address,
                isActive: l.is_active,
                createdAt: l.created_at
            }));
        },

        async create(location: Omit<Location, 'id' | 'createdAt'>): Promise<Location | null> {
            const { data, error } = await supabase
                .from('locations')
                .insert([{
                    name: location.name,
                    type: location.type,
                    address: location.address,
                    is_active: location.isActive
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating location:', error);
                return null;
            }
            return {
                id: data.id,
                name: data.name,
                type: data.type,
                address: data.address,
                isActive: data.is_active,
                createdAt: data.created_at
            };
        },

        async update(id: string, updates: Partial<Location>): Promise<boolean> {
            const { error } = await supabase
                .from('locations')
                .update({
                    name: updates.name,
                    type: updates.type,
                    address: updates.address,
                    is_active: updates.isActive
                })
                .eq('id', id);

            if (error) {
                console.error('Error updating location:', error);
                return false;
            }
            return true;
        },

        async delete(id: string): Promise<boolean> {
            const { error } = await supabase
                .from('locations')
                .update({ is_active: false })
                .eq('id', id);

            if (error) {
                console.error('Error deactivating location:', error);
                return false;
            }
            return true;
        }
    },

    customers: {
        async getAll(): Promise<Customer[]> {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('name');

            if (error || !data) {
                console.error('Error fetching customers:', error);
                return [];
            }
            return data.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type as CustomerType,
                contactInfo: {
                    phone: c.contact_phone,
                    email: c.contact_email,
                    address: c.address
                },
                status: c.status || 'Active',
                createdDate: c.created_at,
                lastTransactionDate: c.last_transaction_date,
                totalPurchases: Number(c.total_purchases) || 0,
                averageTransactionSize: Number(c.average_transaction_size) || 0,
                notes: c.notes
            }));
        },

        async getById(id: string): Promise<Customer | null> {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                console.error('Error fetching customer:', error);
                return null;
            }

            return {
                id: data.id,
                name: data.name,
                type: data.type as CustomerType,
                contactInfo: {
                    phone: data.contact_phone,
                    email: data.contact_email,
                    address: data.address
                },
                status: data.status || 'Active',
                createdDate: data.created_at,
                lastTransactionDate: data.last_transaction_date,
                totalPurchases: Number(data.total_purchases) || 0,
                averageTransactionSize: Number(data.average_transaction_size) || 0,
                notes: data.notes
            };
        },

        async create(customer: Omit<Customer, 'id'>): Promise<Customer | null> {
            try {
                const { data, error } = await supabase
                    .from('customers')
                    .insert([{
                        name: customer.name,
                        type: customer.type,
                        contact_phone: customer.contactInfo?.phone || null,
                        contact_email: customer.contactInfo?.email || null,
                        address: customer.contactInfo?.address || null,
                        status: customer.status || 'Active',
                        notes: customer.notes || null,
                        total_purchases: customer.totalPurchases || 0,
                        average_transaction_size: customer.averageTransactionSize || 0,
                        is_active: true
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('Error creating customer:', error);
                    // If it's a column doesn't exist error, try with basic fields only
                    if (error.message.includes('column') && error.message.includes('does not exist')) {
                        console.log('Falling back to basic customer creation...');
                        const { data: basicData, error: basicError } = await supabase
                            .from('customers')
                            .insert([{
                                name: customer.name,
                                type: customer.type,
                                contact_phone: customer.contactInfo?.phone || null,
                                contact_email: customer.contactInfo?.email || null,
                                address: customer.contactInfo?.address || null,
                                is_active: true
                            }])
                            .select()
                            .single();

                        if (basicError) {
                            console.error('Error creating customer with basic fields:', basicError);
                            return null;
                        }

                        return {
                            id: basicData.id,
                            name: basicData.name,
                            type: basicData.type as CustomerType,
                            contactInfo: {
                                phone: basicData.contact_phone,
                                email: basicData.contact_email,
                                address: basicData.address
                            },
                            status: 'Active',
                            createdDate: basicData.created_at,
                            lastTransactionDate: null,
                            totalPurchases: 0,
                            averageTransactionSize: 0,
                            notes: null
                        };
                    }
                    return null;
                }

                return {
                    id: data.id,
                    name: data.name,
                    type: data.type as CustomerType,
                    contactInfo: {
                        phone: data.contact_phone,
                        email: data.contact_email,
                        address: data.address
                    },
                    status: data.status || 'Active',
                    createdDate: data.created_at,
                    lastTransactionDate: data.last_transaction_date,
                    totalPurchases: Number(data.total_purchases) || 0,
                    averageTransactionSize: Number(data.average_transaction_size) || 0,
                    notes: data.notes
                };
            } catch (error) {
                console.error('Unexpected error creating customer:', error);
                return null;
            }
        },

        async update(customer: Customer): Promise<Customer | null> {
            const { data, error } = await supabase
                .from('customers')
                .update({
                    name: customer.name,
                    type: customer.type,
                    contact_phone: customer.contactInfo?.phone,
                    contact_email: customer.contactInfo?.email,
                    address: customer.contactInfo?.address,
                    status: customer.status,
                    notes: customer.notes,
                    total_purchases: customer.totalPurchases,
                    average_transaction_size: customer.averageTransactionSize,
                    updated_at: new Date().toISOString()
                })
                .eq('id', customer.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating customer:', error);
                return null;
            }

            return {
                id: data.id,
                name: data.name,
                type: data.type as CustomerType,
                contactInfo: {
                    phone: data.contact_phone,
                    email: data.contact_email,
                    address: data.address
                },
                status: data.status,
                createdDate: data.created_at,
                lastTransactionDate: data.last_transaction_date,
                totalPurchases: Number(data.total_purchases) || 0,
                averageTransactionSize: Number(data.average_transaction_size) || 0,
                notes: data.notes
            };
        },

        async delete(id: string): Promise<boolean> {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting customer:', error);
                return false;
            }
            return true;
        },

        async getTransactionHistory(customerId: string): Promise<Transaction[]> {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (error || !data) {
                console.error('Error fetching customer transactions:', error);
                return [];
            }

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
        },

        async getStats(): Promise<any> {
            // Get total customers
            const { data: allCustomers, error: customersError } = await supabase
                .from('customers')
                .select('id, status, type');

            if (customersError) {
                console.error('Error fetching customer stats:', customersError);
                return {
                    totalCustomers: 0,
                    activeCustomers: 0,
                    dealerCount: 0,
                    endUserCount: 0,
                    topCustomers: [],
                    recentTransactions: []
                };
            }

            const totalCustomers = allCustomers?.length || 0;
            const activeCustomers = allCustomers?.filter(c => c.status === 'Active').length || 0;
            const dealerCount = allCustomers?.filter(c => c.type === CustomerType.DEALER).length || 0;
            const endUserCount = allCustomers?.filter(c => c.type === CustomerType.END_USER).length || 0;

            // Get top customers by total purchases
            const { data: topCustomersData } = await supabase
                .from('customers')
                .select('*')
                .order('total_purchases', { ascending: false })
                .limit(5);

            const topCustomers = topCustomersData?.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type as CustomerType,
                contactInfo: {
                    phone: c.contact_phone,
                    email: c.contact_email,
                    address: c.address
                },
                status: c.status,
                createdDate: c.created_at,
                lastTransactionDate: c.last_transaction_date,
                totalPurchases: Number(c.total_purchases) || 0,
                averageTransactionSize: Number(c.average_transaction_size) || 0,
                notes: c.notes
            })) || [];

            // Get recent transactions
            const { data: recentTransactionsData } = await supabase
                .from('transactions')
                .select('*')
                .not('customer_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10);

            const recentTransactions = recentTransactionsData?.map((t: any) => ({
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
            })) || [];

            return {
                totalCustomers,
                activeCustomers,
                dealerCount,
                endUserCount,
                topCustomers,
                recentTransactions
            };
        },

        async search(query: string): Promise<Customer[]> {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .or(`name.ilike.%${query}%,contact_phone.ilike.%${query}%,contact_email.ilike.%${query}%,address.ilike.%${query}%`)
                .order('name');

            if (error || !data) {
                console.error('Error searching customers:', error);
                return [];
            }

            return data.map((c: any) => ({
                id: c.id,
                name: c.name,
                type: c.type as CustomerType,
                contactInfo: {
                    phone: c.contact_phone,
                    email: c.contact_email,
                    address: c.address
                },
                status: c.status || 'Active',
                createdDate: c.created_at,
                lastTransactionDate: c.last_transaction_date,
                totalPurchases: Number(c.total_purchases) || 0,
                averageTransactionSize: Number(c.average_transaction_size) || 0,
                notes: c.notes
            }));
        },

        async updateStats(customerId: string): Promise<boolean> {
            // Calculate customer statistics from transactions
            const { data: transactions } = await supabase
                .from('transactions')
                .select('volume, created_at')
                .eq('customer_id', customerId)
                .eq('status', 'APPROVED');

            if (!transactions || transactions.length === 0) {
                return true; // No transactions, stats remain at 0
            }

            const totalVolume = transactions.reduce((sum, t) => sum + Number(t.volume), 0);
            const averageTransactionSize = totalVolume / transactions.length;
            const lastTransactionDate = transactions
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                .created_at;

            const { error } = await supabase
                .from('customers')
                .update({
                    total_purchases: totalVolume,
                    average_transaction_size: averageTransactionSize,
                    last_transaction_date: lastTransactionDate
                })
                .eq('id', customerId);

            if (error) {
                console.error('Error updating customer stats:', error);
                return false;
            }

            return true;
        }
    },

    prices: {
        async getAll(): Promise<Price[]> {
            const { data, error } = await supabase
                .from('prices')
                .select('*')
                .order('product');

            if (error || !data) {
                console.error('Error fetching prices:', error);
                return [];
            }
            return data.map((p: any) => ({
                id: p.id,
                product: p.product as ProductType,
                customerType: p.customer_type as CustomerType,
                pricePerLiter: Number(p.price_per_liter),
                lastUpdated: p.updated_at,
                updatedBy: p.updated_by
            }));
        },

        async update(id: string, price: number, user: string): Promise<boolean> {
            const { error } = await supabase
                .from('prices')
                .update({
                    price_per_liter: price,
                    updated_by: user,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) {
                console.error('Error updating price:', error);
                return false;
            }
            return true;
        },

        async getPrice(product: ProductType, customerType: CustomerType): Promise<number> {
            const { data, error } = await supabase
                .from('prices')
                .select('price_per_liter')
                .eq('product', product)
                .eq('customer_type', customerType)
                .single();

            if (error || !data) return 0;
            return Number(data.price_per_liter);
        }
    }
};
