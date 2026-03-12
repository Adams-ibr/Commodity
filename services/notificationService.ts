// =====================================================
// NOTIFICATION SERVICE
// =====================================================
import { ApiResponse } from '../types_commodity';

export class NotificationService {
    private async sendWhatsAppNotification(message: string): Promise<ApiResponse<any>> {
        try {
            const response = await fetch('/api/whatsapp-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            const data = await response.json();
            if (!response.ok) return { success: false, error: data.error || 'Failed to send WhatsApp notification' };
            return { success: true, data };
        } catch (error) {
            console.error('Notification error:', error);
            return { success: false, error: 'Network error while sending notification' };
        }
    }

    async notifyInvoiceCreated(invoice: any): Promise<ApiResponse<any>> {
        const message = `🔔 *New Invoice Created*\n\n` +
            `📄 *Number:* ${invoice.invoiceNumber}\n` +
            `👤 *Client:* ${invoice.buyerName || invoice.supplierName}\n` +
            `💰 *Amount:* ${invoice.currency} ${Number(invoice.totalAmount).toLocaleString()}\n` +
            `📅 *Due Date:* ${invoice.dueDate}\n\n` +
            `View details in the dashboard.`;

        return this.sendWhatsAppNotification(message);
    }

    async notifyOrderCreated(order: any, type: 'Purchase' | 'Sales'): Promise<ApiResponse<any>> {
        const orderName = type === 'Purchase' ? 'Purchase Contract' : 'Sales Contract';
        const partner = type === 'Purchase' ? 'Supplier' : 'Buyer';
        const partnerName = type === 'Purchase' ? order.supplierId : order.buyerId; // Ideal would be the name, but we might only have IDs in the creation response

        const message = `📦 *New ${orderName} Created*\n\n` +
            `🔢 *Number:* ${order.contractNumber}\n` +
            `🤝 *${partner}:* ${partnerName}\n` +
            `💎 *Commodity:* ${order.commodityTypeId}\n` +
            `📏 *Quantity:* ${Number(order.contractedQuantity).toLocaleString()} MT\n` +
            `💰 *Value:* ${order.currency} ${Number(order.totalAmount || order.totalValue).toLocaleString()}\n\n` +
            `System update complete.`;

        return this.sendWhatsAppNotification(message);
    }
}
