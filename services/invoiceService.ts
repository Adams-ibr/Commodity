// =====================================================
// INVOICE SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import { ApiResponse } from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceType = 'SALES' | 'PURCHASE';

export interface Invoice {
    id: string;
    companyId: string;
    type: InvoiceType;
    invoiceNumber: string;
    buyerId?: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerAddress?: string;
    supplierId?: string;
    supplierName?: string;
    salesContractId?: string;
    salesContractNumber?: string;
    salesContractItemId?: string;
    purchaseContractId?: string;
    purchaseContractNumber?: string;
    purchaseContractItemId?: string;
    invoiceDate: string;
    dueDate: string;
    items: InvoiceItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
    currency: string;
    notes?: string;
    paymentTerms?: string;
    status: InvoiceStatus;
    paidAt?: string;
    createdBy: string;
    createdAt: string;
}

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export class InvoiceService {
    async getInvoices(
        params: { companyId?: string; page?: number; limit?: number; status?: InvoiceStatus; type?: InvoiceType; contractId?: string } = {}
    ): Promise<ApiResponse<{ data: Invoice[]; total: number }>> {
        const { companyId = DEFAULT_COMPANY_ID, page = 1, limit = 100, status, type, contractId } = params;
        const offset = (page - 1) * limit;
        try {
            const queries = [
                Query.equal('company_id', companyId),
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ];
            if (status) queries.push(Query.equal('status', status));
            if (type) queries.push(Query.equal('type', type));
            if (contractId) {
                // Check both sales and purchase contract fields
                // Note: Standard dbList doesn't support OR yet, so we filter by one or the other if specific type is known
                if (type === 'SALES') queries.push(Query.equal('sales_contract_id', contractId));
                else if (type === 'PURCHASE') queries.push(Query.equal('purchase_contract_id', contractId));
            }

            const { data, total, error } = await dbList(COLLECTIONS.INVOICES, queries);
            if (error) return { success: false, error };
            const invoices: Invoice[] = (data || []).map((item: any) => ({
                id: item.$id,
                companyId: item.company_id,
                type: (item.type || 'SALES') as InvoiceType,
                invoiceNumber: item.invoice_number,
                buyerId: item.buyer_id || '',
                buyerName: item.buyer_name || '',
                buyerEmail: item.buyer_email || '',
                buyerAddress: item.buyer_address || '',
                supplierId: item.supplier_id || '',
                supplierName: item.supplier_name || '',
                salesContractId: item.sales_contract_id || '',
                salesContractNumber: item.sales_contract_number || '',
                salesContractItemId: item.sales_contract_item_id || '',
                purchaseContractId: item.purchase_contract_id || '',
                purchaseContractNumber: item.purchase_contract_number || '',
                purchaseContractItemId: item.purchase_contract_item_id || '',
                invoiceDate: item.invoice_date,
                dueDate: item.due_date,
                items: item.items ? (typeof item.items === 'string' ? JSON.parse(item.items) : item.items) : [],
                subtotal: Number(item.subtotal || 0),
                taxRate: Number(item.tax_rate || 0),
                taxAmount: Number(item.tax_amount || 0),
                discount: Number(item.discount || 0),
                totalAmount: Number(item.total_amount || 0),
                amountPaid: Number(item.amount_paid || 0),
                balanceDue: Number(item.balance_due || 0),
                currency: item.currency || 'USD',
                notes: item.notes || '',
                payment_terms: item.payment_terms || '',
                status: item.status as InvoiceStatus,
                paidAt: item.paid_at || null,
                createdBy: item.created_by || '',
                createdAt: item.$createdAt,
            }));
            return { success: true, data: { data: invoices, total: total || 0 } };
        } catch (error) { return { success: false, error: 'Failed to fetch invoices' }; }
    }

    async createInvoice(
        invoiceData: Omit<Invoice, 'id' | 'createdAt'>,
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<Invoice>> {
        try {
            // Validate Contract status if linked
            if (invoiceData.type === 'SALES' && invoiceData.salesContractId) {
                const { data: contract } = await dbGet(COLLECTIONS.SALES_CONTRACTS, invoiceData.salesContractId);
                if (!contract || contract.status !== 'ACTIVE') {
                    return { success: false, error: 'Cannot create invoice for a sales contract that is not ACTIVE' };
                }
            } else if (invoiceData.type === 'PURCHASE' && invoiceData.purchaseContractId) {
                const { data: contract } = await dbGet(COLLECTIONS.PURCHASE_CONTRACTS, invoiceData.purchaseContractId);
                if (!contract || contract.status !== 'ACTIVE') {
                    return { success: false, error: 'Cannot create bill for a purchase contract that is not ACTIVE' };
                }
            }

            const { data, error } = await dbCreate(COLLECTIONS.INVOICES, {
                company_id: companyId,
                type: invoiceData.type || 'SALES',
                invoice_number: invoiceData.invoiceNumber,
                buyer_id: invoiceData.buyerId || null,
                buyer_name: invoiceData.buyerName || '',
                buyer_email: invoiceData.buyerEmail || '',
                buyer_address: invoiceData.buyerAddress || '',
                supplier_id: invoiceData.supplierId || null,
                supplier_name: invoiceData.supplierName || '',
                sales_contract_id: invoiceData.salesContractId || null,
                sales_contract_number: invoiceData.salesContractNumber || '',
                sales_contract_item_id: invoiceData.salesContractItemId || null,
                purchase_contract_id: invoiceData.purchaseContractId || null,
                purchase_contract_number: invoiceData.purchaseContractNumber || '',
                purchase_contract_item_id: invoiceData.purchaseContractItemId || null,
                invoice_date: invoiceData.invoiceDate,
                due_date: invoiceData.dueDate,
                items: JSON.stringify(invoiceData.items),
                subtotal: invoiceData.subtotal,
                tax_rate: invoiceData.taxRate,
                tax_amount: invoiceData.taxAmount,
                discount: invoiceData.discount,
                total_amount: invoiceData.totalAmount,
                amount_paid: invoiceData.amountPaid || 0,
                balance_due: invoiceData.balanceDue,
                currency: invoiceData.currency,
                notes: invoiceData.notes || '',
                payment_terms: invoiceData.paymentTerms || '',
                status: invoiceData.status || 'DRAFT',
                created_by: invoiceData.createdBy || '',
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return {
                success: true,
                data: { ...invoiceData, id: data.$id, createdAt: data.$createdAt }
            };
        } catch (error) { return { success: false, error: 'Failed to create invoice' }; }
    }

    async updateInvoice(id: string, updates: Partial<Invoice>): Promise<ApiResponse<void>> {
        try {
            const payload: any = {};
            if (updates.status) payload.status = updates.status;
            if (updates.amountPaid !== undefined) payload.amount_paid = updates.amountPaid;
            if (updates.balanceDue !== undefined) payload.balance_due = updates.balanceDue;
            if (updates.paidAt) payload.paid_at = updates.paidAt;
            if (updates.notes !== undefined) payload.notes = updates.notes;
            if (updates.buyerName) payload.buyer_name = updates.buyerName;
            if (updates.dueDate) payload.due_date = updates.dueDate;
            if (updates.items) payload.items = JSON.stringify(updates.items);
            if (updates.subtotal !== undefined) payload.subtotal = updates.subtotal;
            if (updates.taxAmount !== undefined) payload.tax_amount = updates.taxAmount;
            if (updates.discount !== undefined) payload.discount = updates.discount;
            if (updates.totalAmount !== undefined) payload.total_amount = updates.totalAmount;

            const { error } = await dbUpdate(COLLECTIONS.INVOICES, id, payload);
            if (error) return { success: false, error };
            return { success: true };
        } catch (error) { return { success: false, error: 'Failed to update invoice' }; }
    }

    async recordPayment(id: string, amount: number, invoice: Invoice): Promise<ApiResponse<void>> {
        const newAmountPaid = invoice.amountPaid + amount;
        const newBalance = invoice.totalAmount - newAmountPaid;
        const isFullyPaid = newBalance <= 0;

        return this.updateInvoice(id, {
            amountPaid: newAmountPaid,
            balanceDue: Math.max(0, newBalance),
            status: isFullyPaid ? 'PAID' : invoice.status,
            paidAt: isFullyPaid ? new Date().toISOString() : undefined,
        });
    }
}
