import { supabase } from './supabaseClient';
import { InventoryItem, Transaction, AuditLogEntry, ProductType, TransactionType, UserRole, Customer, CustomerType, Price, Location, Reconciliation, ReconciliationStatus } from '../types';

// Location type for API
// Location type for API
// Imported from types.ts

// Inventory Service
export const api = {
    inventory: {
        async getAll(): Promise<InventoryItem[]> {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*');

            if (error) {
                console.error('Error fetching inventory:', error);
                throw error;
            }
            if (!data) return [];
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
        /**
         * Atomically get the next sequence number for a given date prefix.
         * Uses the invoice_counters table to guarantee sequential, gap-free numbering.
         */
        async _getNextSequence(datePrefix: string): Promise<number> {
            // First, ensure a row exists for this date (upsert with ON CONFLICT DO NOTHING)
            await supabase
                .from('invoice_counters')
                .upsert(
                    { date_prefix: datePrefix, current_seq: 0 },
                    { onConflict: 'date_prefix', ignoreDuplicates: true }
                );

            // Atomically increment and read the new value using RPC
            const { data, error } = await supabase.rpc('increment_invoice_counter', {
                p_date_prefix: datePrefix
            });

            if (error || data === null || data === undefined) {
                console.error('Error incrementing invoice counter:', error);
                // Fallback: read current value and add 1
                const { data: row } = await supabase
                    .from('invoice_counters')
                    .select('current_seq')
                    .eq('date_prefix', datePrefix)
                    .single();
                const fallbackSeq = (row?.current_seq || 0) + 1;
                // Try to update manually
                await supabase
                    .from('invoice_counters')
                    .update({ current_seq: fallbackSeq })
                    .eq('date_prefix', datePrefix);
                return fallbackSeq;
            }

            return data as number;
        },

        /**
         * Create a transaction with atomic invoice number generation.
         * If tx.refDoc is provided, uses it directly.
         * If tx.datePrefix is provided, generates a unique invoice number atomically.
         */
        async create(tx: any): Promise<Transaction | null> {
            // If refDoc is already provided (e.g., for non-sale transactions) and NO datePrefix, use it directly
            // Unless it's a RECEIPT which we now want to auto-generate if possible
            if (tx.refDoc && !tx.datePrefix && tx.type !== 'RECEIPT') {
                return this._insertTransaction(tx, tx.refDoc);
            }

            // Auto-generation logic for Sales (INV) and Receipts (RCP)
            const dateStr = tx.datePrefix || new Date().toISOString().slice(0, 10).replace(/-/g, '');

            // Determine prefix and counter key
            let prefix = 'INV';
            let counterKey = dateStr; // Default for invoices (INV) to match existing DB seed

            if (tx.type === 'RECEIPT') {
                prefix = 'RCP';
                counterKey = `RCP-${dateStr}`; // Separate sequence for receipts
            }

            // Get next sequence
            const nextSeq = await this._getNextSequence(counterKey);
            const refNumber = `${prefix}-${dateStr}-${String(nextSeq).padStart(4, '0')}`;

            // If the caller provided a manual refDoc but we auto-generated one, we override it.
            // This enforces server-side generation for consistency.

            const result = await this._insertTransaction(tx, refNumber);
            if (result) {
                return result;
            }

            // If insert failed (very unlikely with atomic counter), log and return null
            console.error(`Failed to insert transaction with ref ${refNumber}`);
            return null;
        },

        /**
         * Internal helper to insert a transaction with a specific reference doc
         */
        async _insertTransaction(tx: any, refDoc: string): Promise<Transaction | null> {
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
                    reference_doc: refDoc,
                    performed_by: tx.performedBy,
                    status: tx.status,
                    unit_price: tx.unitPrice || null,
                    total_amount: tx.totalAmount || null,
                    payment_method: tx.paymentMethod || null
                }])
                .select()
                .single();

            if (error) {
                // Check if it's a unique constraint violation (duplicate invoice)
                if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
                    return null; // Signal to retry with different number
                }
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
                customerName: data.customer_name,
                unitPrice: data.unit_price ? Number(data.unit_price) : undefined,
                totalAmount: data.total_amount ? Number(data.total_amount) : undefined,
                paymentMethod: data.payment_method || undefined
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
                customerName: t.customer_name,
                unitPrice: t.unit_price ? Number(t.unit_price) : undefined,
                totalAmount: t.total_amount ? Number(t.total_amount) : undefined,
                paymentMethod: t.payment_method || undefined
            }));
        },

        /**
         * Get the current invoice counter value for a given date.
         * Returns the last used invoice number string, or null if none exist.
         */
        async getLastInvoiceNumber(dateStr: string): Promise<string | null> {
            const { data, error } = await supabase
                .from('invoice_counters')
                .select('current_seq')
                .eq('date_prefix', dateStr)
                .maybeSingle();

            if (error || !data || data.current_seq === 0) return null;
            return `INV-${dateStr}-${String(data.current_seq).padStart(4, '0')}`;
        },

        /**
         * Get the current counter value for any key (date prefix or arbitrary key)
         * Useful for previewing next sequence number
         */
        async getCurrentSequence(counterKey: string): Promise<number> {
            const { data } = await supabase
                .from('invoice_counters')
                .select('current_seq')
                .eq('date_prefix', counterKey)
                .maybeSingle();

            return data?.current_seq || 0;
        },

        // Backward compatibility alias
        async getCurrentInvoiceSeq(dateStr: string): Promise<number> {
            return this.getCurrentSequence(dateStr);
        },

        async delete(id: string): Promise<boolean> {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting transaction:', error);
                return false;
            }
            return true;
        }
    },

    audit: {
        async log(action: string, details: string, user: string, role: string) {
            try {
                const { error } = await supabase.from('audit_logs').insert([{
                    action,
                    details,
                    user_id: user,
                    user_role: role,
                    ip_hash: '127.0.0.1' // Placeholder
                }]);
                if (error) console.error('Audit log failed:', error);
            } catch (err) {
                console.error('Audit log exception:', err);
            }
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
            let allCustomers: any[] = [];
            let page = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('customers')
                    .select('*')
                    .order('name')
                    .range(page * pageSize, (page + 1) * pageSize - 1);

                if (error) {
                    console.error('Error fetching customers:', error);
                    // If we have some data, return what we have, otherwise empty
                    if (allCustomers.length > 0) return this._mapCustomers(allCustomers);
                    return [];
                }

                if (!data || data.length === 0) {
                    hasMore = false;
                } else {
                    allCustomers = [...allCustomers, ...data];
                    if (data.length < pageSize) {
                        hasMore = false;
                    } else {
                        page++;
                    }
                }
            }

            return this._mapCustomers(allCustomers);
        },

        // Helper to map DB response to Customer type
        _mapCustomers(data: any[]): Customer[] {
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

        async bulkCreate(customers: Omit<Customer, 'id'>[]): Promise<{ success: number; failed: number; skipped: number; errors: string[] }> {
            let success = 0;
            let failed = 0;
            let skipped = 0;
            const errors: string[] = [];

            // 1. Fetch existing customer names to prevent duplicates
            // We fetch all names for simplicity. For massive datasets, we might want to paginate or filter by the new names,
            // but for a typical import of a few thousand, fetching names is fine.
            const { data: existingData, error } = await supabase
                .from('customers')
                .select('name');

            if (error) {
                console.error('Error fetching existing customers for deduplication:', error);
                // Fail safe: proceed but warn, or just return error? 
                // Let's proceed but we might create duplicates if we can't check. 
                // Better to return error for bulk op.
                return { success: 0, failed: 0, skipped: 0, errors: ['Failed to check for duplicates. Import aborted.'] };
            }

            const existingNames = new Set(existingData?.map(c => c.name.trim().toLowerCase()) || []);

            // 2. Filter new customers
            const newCustomers = customers.filter(c => {
                const normalizedName = c.name.trim().toLowerCase();
                if (existingNames.has(normalizedName)) {
                    skipped++;
                    return false;
                }
                // Also prevent duplicates within the import file itself
                existingNames.add(normalizedName);
                return true;
            });

            // 3. Create only new customers
            for (const customer of newCustomers) {
                const result = await this.create(customer);
                if (result) {
                    success++;
                } else {
                    failed++;
                    errors.push(`Failed to create customer: ${customer.name}`);
                }
            }

            return { success, failed, skipped, errors };
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
    },

    users: {
        async getAll(): Promise<any[]> {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data) {
                console.error('Error fetching users:', error);
                return [];
            }
            return data.map((u: any) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                role: u.role,
                location: u.location,
                isActive: u.is_active !== false, // Default to true if not set
                createdAt: u.created_at
            }));
        },

        async create(userData: { email: string; name: string; role: string; location: string; password: string }): Promise<any | null> {
            try {
                // Get current session for authorization
                const { data: { session } } = await supabase.auth.getSession();

                if (!session) {
                    console.error('No active session');
                    return null;
                }

                // Call the serverless function to create user
                const response = await fetch('/api/createUser', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify(userData)
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    let errorMessage = 'Failed to create user';
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorMessage = errorJson.error || errorMessage;
                    } catch (e) {
                        // use text
                        errorMessage = errorBody;
                    }
                    console.error('API Error:', errorMessage);
                    throw new Error(errorMessage);
                }

                const data = await response.json();

                return {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role,
                    location: data.location,
                    isActive: data.is_active,
                    createdAt: data.created_at
                };

            } catch (error) {
                console.error('Error creating user via API:', error);
                return null;
            }
        },

        async update(id: string, updates: Partial<{ name: string; role: string; location: string }>): Promise<any | null> {
            const { data, error } = await supabase
                .from('users')
                .update({
                    name: updates.name,
                    role: updates.role,
                    location: updates.location
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating user:', error);
                return null;
            }

            return {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                location: data.location,
                isActive: data.is_active,
                createdAt: data.created_at
            };
        },

        async updateRole(id: string, role: string): Promise<any | null> {
            const { data, error } = await supabase
                .from('users')
                .update({ role })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error updating user role:', error);
                return null;
            }

            return {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                location: data.location,
                isActive: data.is_active,
                createdAt: data.created_at
            };
        },

        async toggleStatus(id: string, isActive: boolean): Promise<any | null> {
            const { data, error } = await supabase
                .from('users')
                .update({ is_active: isActive })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error('Error toggling user status:', error);
                return null;
            }

            return {
                id: data.id,
                email: data.email,
                name: data.name,
                role: data.role,
                location: data.location,
                isActive: data.is_active,
                createdAt: data.created_at
            };
        },

        async delete(id: string): Promise<boolean> {
            // Soft delete by setting is_active to false, or hard delete
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting user:', error);
                return false;
            }
            return true;
        }
    },

    reconciliations: {
        async getAll(): Promise<Reconciliation[]> {
            const { data, error } = await supabase
                .from('reconciliations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reconciliations:', error);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                date: r.date,
                location: r.location,
                product: r.product as ProductType,
                openingVolume: Number(r.opening_volume),
                expectedVolume: Number(r.expected_volume),
                actualVolume: Number(r.actual_volume),
                variance: Number(r.variance),
                variancePercent: Number(r.variance_percent),
                status: r.status,
                notes: r.notes,
                reconciledBy: r.reconciled_by,
                createdAt: r.created_at,
                dealerSalesAmount: Number(r.dealer_sales_amount || 0),
                endUserSalesVolume: Number(r.end_user_sales_volume || 0),
                endUserSalesAmount: Number(r.end_user_sales_amount || 0),
                expectedAmount: Number(r.expected_amount || 0),
                posCashless: Number(r.pos_cashless || 0),
                cashPayments: Number(r.cash_payments || 0),
                parameters: r.parameters || undefined,
                approvalStatus: r.approval_status || 'PENDING',
                approvedBy: r.approved_by,
                approvedAt: r.approved_at,
                rejectionReason: r.rejection_reason
            }));
        },

        async getByDate(date: string): Promise<Reconciliation[]> {
            const { data, error } = await supabase
                .from('reconciliations')
                .select('*')
                .eq('date', date)
                .order('location', { ascending: true });

            if (error) {
                console.error('Error fetching reconciliations by date:', error);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                date: r.date,
                location: r.location,
                product: r.product as ProductType,
                openingVolume: Number(r.opening_volume),
                expectedVolume: Number(r.expected_volume),
                actualVolume: Number(r.actual_volume),
                variance: Number(r.variance),
                variancePercent: Number(r.variance_percent),
                status: r.status,
                notes: r.notes,
                reconciledBy: r.reconciled_by,
                createdAt: r.created_at,
                dealerSalesAmount: Number(r.dealer_sales_amount || 0),
                endUserSalesVolume: Number(r.end_user_sales_volume || 0),
                endUserSalesAmount: Number(r.end_user_sales_amount || 0),
                expectedAmount: Number(r.expected_amount || 0),
                posCashless: Number(r.pos_cashless || 0),
                cashPayments: Number(r.cash_payments || 0),
                parameters: r.parameters || undefined,
                approvalStatus: r.approval_status || 'PENDING',
                approvedBy: r.approved_by,
                approvedAt: r.approved_at,
                rejectionReason: r.rejection_reason
            }));
        },

        async create(recon: Omit<Reconciliation, 'id' | 'createdAt'>): Promise<Reconciliation> {
            const { data, error } = await supabase
                .from('reconciliations')
                .insert([{
                    date: recon.date,
                    location: recon.location,
                    product: recon.product,
                    opening_volume: recon.openingVolume,
                    expected_volume: recon.expectedVolume,
                    actual_volume: recon.actualVolume,
                    variance: recon.variance,
                    variance_percent: recon.variancePercent,
                    status: recon.status,
                    notes: recon.notes,
                    reconciled_by: recon.reconciledBy,
                    dealer_sales_amount: recon.dealerSalesAmount,
                    end_user_sales_volume: recon.endUserSalesVolume,
                    end_user_sales_amount: recon.endUserSalesAmount,
                    expected_amount: recon.expectedAmount,
                    pos_cashless: recon.posCashless,
                    cash_payments: recon.cashPayments,
                    parameters: recon.parameters || null,
                    approval_status: 'PENDING'
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating reconciliation:', error);
                throw new Error(`Failed to create reconciliation: ${error.message}`);
            }

            return {
                id: data.id,
                date: data.date,
                location: data.location,
                product: data.product as ProductType,
                openingVolume: Number(data.opening_volume),
                expectedVolume: Number(data.expected_volume),
                actualVolume: Number(data.actual_volume),
                variance: Number(data.variance),
                variancePercent: Number(data.variance_percent),
                status: data.status,
                notes: data.notes,
                reconciledBy: data.reconciled_by,
                createdAt: data.created_at,
                dealerSalesAmount: Number(data.dealer_sales_amount || 0),
                endUserSalesVolume: Number(data.end_user_sales_volume || 0),
                endUserSalesAmount: Number(data.end_user_sales_amount || 0),
                expectedAmount: Number(data.expected_amount || 0),
                posCashless: Number(data.pos_cashless || 0),
                cashPayments: Number(data.cash_payments || 0),
                parameters: data.parameters || undefined,
                approvalStatus: data.approval_status || 'PENDING'
            };
        },

        async updateNotes(id: string, notes: string): Promise<boolean> {
            const { error } = await supabase
                .from('reconciliations')
                .update({ notes })
                .eq('id', id);

            if (error) {
                console.error('Error updating reconciliation notes:', error);
                return false;
            }
            return true;
        },

        async approve(id: string, approverName: string): Promise<boolean> {
            const { error } = await supabase
                .from('reconciliations')
                .update({
                    approval_status: 'APPROVED',
                    approved_by: approverName,
                    approved_at: new Date().toISOString(),
                    rejection_reason: null
                })
                .eq('id', id);

            if (error) {
                console.error('Error approving reconciliation:', error);
                return false;
            }
            return true;
        },

        async reject(id: string, reason: string): Promise<boolean> {
            const { error } = await supabase
                .from('reconciliations')
                .update({
                    approval_status: 'REJECTED',
                    rejection_reason: reason,
                    approved_by: null,
                    approved_at: null
                })
                .eq('id', id);

            if (error) {
                console.error('Error rejecting reconciliation:', error);
                return false;
            }
            return true;
        },

        /**
         * Run daily reconciliation for all inventory items
         * Compares expected volume (opening + receipts - sales - transfers - losses) vs actual
         * Also computes sales breakdowns by customer type and payment method
         */
        async runDailyReconciliation(
            inventory: InventoryItem[],
            transactions: Transaction[],
            userName: string,
            manualOverrides?: Map<string, { posCashless: number; cashPayments: number }>
        ): Promise<Reconciliation[]> {
            const today = new Date().toISOString().split('T')[0];
            const results: Reconciliation[] = [];

            // Delete existing reconciliations for today to allow re-run/update
            const { error: deleteError } = await supabase
                .from('reconciliations')
                .delete()
                .eq('date', today);

            if (deleteError) {
                console.error('Error clearing existing reconciliations:', deleteError);
                throw new Error('Failed to prepare for reconciliation run');
            }

            // Fetch all previous reconciliations to determine opening volumes
            const { data: allRecons } = await supabase
                .from('reconciliations')
                .select('*')
                .lt('date', today)
                .order('date', { ascending: false });

            // Create a map of latest reconciliation per product-location
            const latestReconMap = new Map<string, any>();
            if (allRecons) {
                allRecons.forEach((r: any) => {
                    const key = `${r.location}-${r.product}`;
                    if (!latestReconMap.has(key)) {
                        latestReconMap.set(key, r);
                    }
                });
            }

            // Fetch all customers to build a customerId → type map
            const { data: allCustomers } = await supabase
                .from('customers')
                .select('id, type');
            const customerTypeMap = new Map<string, string>();
            if (allCustomers) {
                allCustomers.forEach((c: any) => {
                    customerTypeMap.set(c.id, c.type);
                });
            }

            // Fetch all prices to build a product+customerType → price map
            const { data: allPrices } = await supabase
                .from('prices')
                .select('product, customer_type, price_per_liter');
            const priceMap = new Map<string, number>();
            if (allPrices) {
                allPrices.forEach((p: any) => {
                    priceMap.set(`${p.product}-${p.customer_type}`, Number(p.price_per_liter));
                });
            }

            // Process each inventory item
            for (const item of inventory) {
                // Calculate transactions for TODAY only
                const itemTransactions = transactions.filter(t =>
                    t.source === item.id &&
                    t.status === 'APPROVED' &&
                    t.timestamp.startsWith(today)
                );

                // Calculate day's movements
                let receipts = 0;
                let outflows = 0;

                // Sales breakdown accumulators
                let dealerSalesAmount = 0;
                let endUserSalesVolume = 0;
                let endUserSalesAmount = 0;
                let posCashless = 0;
                let cashPayments = 0;
                let totalSalesVolume = 0;

                itemTransactions.forEach(tx => {
                    if (tx.type === TransactionType.RECEIPT) {
                        receipts += tx.volume;
                    } else if (tx.type === TransactionType.SALE ||
                        tx.type === TransactionType.TRANSFER ||
                        tx.type === TransactionType.LOSS) {
                        outflows += tx.volume;
                    }

                    // Only compute sales breakdowns for SALE transactions
                    if (tx.type === TransactionType.SALE) {
                        totalSalesVolume += tx.volume;
                        const txAmount = tx.totalAmount || 0;
                        const custType = tx.customerId ? customerTypeMap.get(tx.customerId) : undefined;

                        if (custType === CustomerType.DEALER) {
                            dealerSalesAmount += txAmount;
                        } else {
                            // Default to end-user if no customer or end-user type
                            endUserSalesVolume += tx.volume;
                            endUserSalesAmount += txAmount;
                        }

                        // Payment method breakdown
                        if (tx.paymentMethod === 'POS') {
                            posCashless += txAmount;
                        } else if (tx.paymentMethod === 'CASH') {
                            cashPayments += txAmount;
                        }
                        // TRANSFER or undefined payment methods are not counted in POS/Cash
                    }
                });

                // Apply manual overrides for POS/Cash if provided (takes precedence)
                if (manualOverrides?.has(item.id)) {
                    const overrides = manualOverrides.get(item.id)!;
                    posCashless = overrides.posCashless;
                    cashPayments = overrides.cashPayments;
                }

                // Determine Opening Volume
                const key = `${item.location}-${item.product}`;
                const previousRecon = latestReconMap.get(key);

                let openingVolume: number;

                if (previousRecon) {
                    openingVolume = Number(previousRecon.actual_volume);
                } else {
                    openingVolume = item.currentVolume - receipts + outflows;
                }

                const expectedVolume = openingVolume + receipts - outflows;
                const actualVolume = item.currentVolume;

                // Calculate variance
                const variance = actualVolume - expectedVolume;

                // Avoid division by zero
                const variancePercent = expectedVolume !== 0
                    ? (variance / expectedVolume) * 100
                    : 0;

                // Determine status based on variance threshold
                let status: ReconciliationStatus;
                const absVariancePercent = Math.abs(variancePercent);
                if (Math.abs(variance) < 0.01) {
                    status = 'BALANCED';
                } else if (absVariancePercent <= 0.5) {
                    status = 'BALANCED';
                } else if (absVariancePercent <= 2) {
                    status = 'VARIANCE_MINOR';
                } else {
                    status = 'VARIANCE_MAJOR';
                }

                // Compute expected amount: total sales volume × average price
                // Use end-user price as the base expected price
                const endUserPriceKey = `${item.product}-${CustomerType.END_USER}`;
                const dealerPriceKey = `${item.product}-${CustomerType.DEALER}`;
                const endUserPrice = priceMap.get(endUserPriceKey) || 0;
                const dealerPrice = priceMap.get(dealerPriceKey) || 0;
                // expectedAmount = sum of (each sale's volume × the applicable price)
                // Simplified: use dealer volume × dealer price + end user volume × end user price
                const dealerSalesVolume = totalSalesVolume - endUserSalesVolume;
                const expectedAmount = (dealerSalesVolume * dealerPrice) + (endUserSalesVolume * endUserPrice);

                const recon = await this.create({
                    date: today,
                    location: item.location,
                    product: item.product,
                    openingVolume,
                    expectedVolume,
                    actualVolume,
                    variance,
                    variancePercent,
                    status,
                    notes: previousRecon ? undefined : 'Initial reconciliation (system baseline)',
                    reconciledBy: userName,
                    dealerSalesAmount,
                    endUserSalesVolume,
                    endUserSalesAmount,
                    expectedAmount,
                    posCashless,
                    cashPayments
                });

                if (recon) {
                    results.push(recon);
                }
            }

            return results;
        },

        async getStats(): Promise<{
            totalToday: number;
            balancedCount: number;
            minorVarianceCount: number;
            majorVarianceCount: number;
            lastReconciliation: string | null;
        }> {
            const today = new Date().toISOString().split('T')[0];
            const todayRecords = await this.getByDate(today);

            const { data: lastRecord } = await supabase
                .from('reconciliations')
                .select('created_at')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return {
                totalToday: todayRecords.length,
                balancedCount: todayRecords.filter(r => r.status === 'BALANCED').length,
                minorVarianceCount: todayRecords.filter(r => r.status === 'VARIANCE_MINOR').length,
                majorVarianceCount: todayRecords.filter(r => r.status === 'VARIANCE_MAJOR').length,
                lastReconciliation: lastRecord?.created_at || null
            };
        }
    }
};
