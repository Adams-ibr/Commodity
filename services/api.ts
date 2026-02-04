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
         * Create a transaction with atomic invoice number generation.
         * If tx.refDoc is provided, uses it directly.
         * If tx.datePrefix is provided, generates a unique invoice number atomically.
         */
        async create(tx: any): Promise<Transaction | null> {
            // If refDoc is already provided (e.g., for non-sale transactions), use it directly
            if (tx.refDoc && !tx.datePrefix) {
                return this._insertTransaction(tx, tx.refDoc);
            }

            // For sales, generate invoice number atomically with retry
            const datePrefix = tx.datePrefix || new Date().toISOString().slice(0, 10).replace(/-/g, '');

            // Try up to 10 times to handle concurrent inserts
            for (let attempt = 0; attempt < 10; attempt++) {
                // Get the next sequence number
                const { data: lastInvoices, error: fetchError } = await supabase
                    .from('transactions')
                    .select('reference_doc')
                    .ilike('reference_doc', `INV-${datePrefix}-%`)
                    .order('reference_doc', { ascending: false })
                    .limit(1);

                let nextSeq = 1;
                if (!fetchError && lastInvoices && lastInvoices.length > 0) {
                    const parts = lastInvoices[0].reference_doc.split('-');
                    if (parts.length === 3) {
                        const seq = parseInt(parts[2], 10);
                        if (!isNaN(seq)) nextSeq = seq + 1;
                    }
                }

                // Add attempt offset to reduce collision probability
                nextSeq += attempt;
                const invoiceNumber = `INV-${datePrefix}-${String(nextSeq).padStart(4, '0')}`;

                // Try to insert with this invoice number
                const result = await this._insertTransaction(tx, invoiceNumber);

                if (result) {
                    return result; // Success!
                }

                // If insert failed due to duplicate, retry with next number
                console.warn(`Invoice ${invoiceNumber} collision, retrying (attempt ${attempt + 1}/10)...`);
                await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
            }

            // Ultimate fallback: timestamp-based unique suffix
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const fallbackRef = `INV-${datePrefix}-T${timestamp}${randomSuffix}`;
            console.warn('All invoice attempts failed, using timestamp fallback:', fallbackRef);

            return this._insertTransaction(tx, fallbackRef);
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
                    total_amount: tx.totalAmount || null
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
                totalAmount: data.total_amount ? Number(data.total_amount) : undefined
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
                totalAmount: t.total_amount ? Number(t.total_amount) : undefined
            }));
        },

        async getLastInvoiceNumber(dateStr: string): Promise<string | null> {
            const { data, error } = await supabase
                .from('transactions')
                .select('reference_doc')
                .ilike('reference_doc', `INV-${dateStr}-%`)
                .order('reference_doc', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) return null;
            return data.reference_doc;
        },

        /**
         * Generate a unique invoice number atomically
         * Uses database-level read-and-increment with retry logic to prevent duplicates
         */
        async getNextInvoiceNumber(dateStr: string): Promise<string> {
            // Try up to 5 times in case of conflicts (concurrent sales)
            for (let attempt = 0; attempt < 5; attempt++) {
                // Get the current max invoice for today
                const { data: lastInvoices, error: fetchError } = await supabase
                    .from('transactions')
                    .select('reference_doc')
                    .ilike('reference_doc', `INV-${dateStr}-%`)
                    .order('reference_doc', { ascending: false })
                    .limit(1);

                let nextSeq = 1;
                if (!fetchError && lastInvoices && lastInvoices.length > 0) {
                    const parts = lastInvoices[0].reference_doc.split('-');
                    if (parts.length === 3) {
                        const seq = parseInt(parts[2], 10);
                        if (!isNaN(seq)) nextSeq = seq + 1;
                    }
                }

                // Add attempt offset to prevent immediate re-collision
                nextSeq += attempt;

                const invoiceNumber = `INV-${dateStr}-${String(nextSeq).padStart(4, '0')}`;

                // Verify this number doesn't already exist (belt and suspenders)
                const { data: existing } = await supabase
                    .from('transactions')
                    .select('id')
                    .eq('reference_doc', invoiceNumber)
                    .maybeSingle();

                if (!existing) {
                    // This invoice number is available
                    return invoiceNumber;
                }

                // If exists, log and retry with next number
                console.warn(`Invoice ${invoiceNumber} already exists, retrying (attempt ${attempt + 1}/5)...`);

                // Small delay to reduce collision probability on retry
                await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
            }

            // Ultimate fallback: use timestamp-based unique suffix
            const timestamp = Date.now().toString(36).toUpperCase();
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            console.warn(`All invoice attempts failed, using timestamp fallback`);
            return `INV-${dateStr}-T${timestamp}${randomSuffix}`;
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

        async bulkCreate(customers: Omit<Customer, 'id'>[]): Promise<{ success: number; failed: number; errors: string[] }> {
            let success = 0;
            let failed = 0;
            const errors: string[] = [];

            for (const customer of customers) {
                const result = await this.create(customer);
                if (result) {
                    success++;
                } else {
                    failed++;
                    errors.push(`Failed to create customer: ${customer.name}`);
                }
            }

            return { success, failed, errors };
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
            // Note: User creation should ideally go through Supabase Auth Admin API
            // This is a simplified implementation
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true,
                user_metadata: {
                    name: userData.name,
                    role: userData.role,
                    location: userData.location
                }
            });

            if (authError) {
                console.error('Error creating user:', authError);
                // Fallback: Try to insert directly into users table (for existing auth users)
                const { data, error } = await supabase
                    .from('users')
                    .insert([{
                        email: userData.email,
                        name: userData.name,
                        role: userData.role,
                        location: userData.location,
                        is_active: true
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('Error inserting user record:', error);
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
            }

            return {
                id: authData.user.id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                location: userData.location,
                isActive: true,
                createdAt: new Date().toISOString()
            };
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
                createdAt: r.created_at
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
                createdAt: r.created_at
            }));
        },

        async create(recon: Omit<Reconciliation, 'id' | 'createdAt'>): Promise<Reconciliation | null> {
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
                    reconciled_by: recon.reconciledBy
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating reconciliation:', error);
                return null;
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
                createdAt: data.created_at
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

        /**
         * Run daily reconciliation for all inventory items
         * Compares expected volume (opening + receipts - sales - transfers - losses) vs actual
         */
        async runDailyReconciliation(
            inventory: InventoryItem[],
            transactions: Transaction[],
            userName: string
        ): Promise<Reconciliation[]> {
            const today = new Date().toISOString().split('T')[0];
            const results: Reconciliation[] = [];

            // Check if already reconciled today
            const existing = await this.getByDate(today);
            if (existing.length > 0) {
                console.log('Reconciliation already exists for today');
                return existing;
            }

            // Process each inventory item
            for (const item of inventory) {
                // Calculate expected volume from transactions
                const itemTransactions = transactions.filter(t =>
                    t.source === item.id &&
                    t.status === 'APPROVED' &&
                    t.timestamp.startsWith(today)
                );

                // Get opening volume (yesterday's closing or current if no previous recon)
                const openingVolume = item.currentVolume; // Simplified - ideally from previous recon

                // Calculate day's movements
                let receipts = 0;
                let outflows = 0;

                itemTransactions.forEach(tx => {
                    if (tx.type === TransactionType.RECEIPT) {
                        receipts += tx.volume;
                    } else if (tx.type === TransactionType.SALE ||
                        tx.type === TransactionType.TRANSFER ||
                        tx.type === TransactionType.LOSS) {
                        outflows += tx.volume;
                    }
                });

                const expectedVolume = openingVolume + receipts - outflows;
                const actualVolume = item.currentVolume;
                const variance = actualVolume - expectedVolume;
                const variancePercent = expectedVolume !== 0
                    ? (variance / expectedVolume) * 100
                    : 0;

                // Determine status based on variance threshold
                let status: ReconciliationStatus;
                const absVariancePercent = Math.abs(variancePercent);
                if (absVariancePercent <= 0.5) {
                    status = 'BALANCED';
                } else if (absVariancePercent <= 2) {
                    status = 'VARIANCE_MINOR';
                } else {
                    status = 'VARIANCE_MAJOR';
                }

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
                    reconciledBy: userName
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
