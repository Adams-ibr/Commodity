import { Transaction, InventoryItem } from '../types';

interface ReceiptData {
  transaction: {
    type: string;
    product: string;
    volume: number;
    referenceDoc: string;
    customerName?: string;
    timestamp: string;
    performedBy: string;
    status: string;
  };
  location: string;
  companyName?: string;
}

/**
 * Generate and print a thermal receipt for a transaction
 * Optimized for 80mm thermal printers
 */
export const printReceipt = (data: ReceiptData) => {
  const { transaction, location, companyName = 'Galaltix Energy' } = data;
  const date = new Date(transaction.timestamp);
  const formattedDate = date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const formattedTime = date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt - ${transaction.referenceDoc}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 2mm;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          width: 76mm;
          max-width: 76mm;
          margin: 0 auto;
          padding: 2mm;
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        
        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .location {
          font-size: 10px;
          color: #333;
        }
        
        .receipt-type {
          font-size: 14px;
          font-weight: bold;
          text-align: center;
          margin: 10px 0;
          padding: 4px;
          background: #f0f0f0;
        }
        
        .row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
        }
        
        .label {
          font-weight: bold;
        }
        
        .value {
          text-align: right;
        }
        
        .divider {
          border-top: 1px dashed #000;
          margin: 8px 0;
        }
        
        .total-row {
          font-size: 14px;
          font-weight: bold;
          margin: 10px 0;
        }
        
        .footer {
          text-align: center;
          font-size: 10px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px dashed #000;
        }
        
        .barcode {
          text-align: center;
          font-family: 'Libre Barcode 39', cursive;
          font-size: 32px;
          margin: 8px 0;
        }
        
        .ref-code {
          text-align: center;
          font-size: 11px;
          letter-spacing: 2px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/favicon.png" alt="Logo" style="width: 50px; height: auto; margin: 0 auto 8px auto; display: block;" />
        <div class="company-name">${companyName}</div>
        <div class="location">${location}</div>
      </div>
      
      <div class="receipt-type">
        ${transaction.type === 'SALE' ? '🧾 SALES RECEIPT' : transaction.type === 'RECEIPT' ? '📦 STOCK RECEIPT' : '📋 ' + transaction.type}
      </div>
      
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${formattedDate}</span>
      </div>
      <div class="row">
        <span class="label">Time:</span>
        <span class="value">${formattedTime}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="row">
        <span class="label">Product:</span>
        <span class="value">${transaction.product}</span>
      </div>
      <div class="row total-row">
        <span class="label">Volume:</span>
        <span class="value">${transaction.volume.toLocaleString()} L</span>
      </div>
      
      ${transaction.customerName ? `
      <div class="divider"></div>
      <div class="row">
        <span class="label">Customer:</span>
        <span class="value">${transaction.customerName}</span>
      </div>
      ` : ''}
      
      <div class="divider"></div>
      
      <div class="row">
        <span class="label">Processed By:</span>
        <span class="value">${transaction.performedBy}</span>
      </div>
      <div class="row">
        <span class="label">Status:</span>
        <span class="value">${transaction.status}</span>
      </div>
      
      <div class="divider"></div>
      
      <div class="ref-code">REF: ${transaction.referenceDoc}</div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p style="font-size: 9px; color: #666;">
          Generated: ${new Date().toLocaleString('en-NG')}
        </p>
      </div>
    </body>
    </html>
  `;

  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  // Get iframe document
  const iframeDoc = iframe.contentWindow?.document;

  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(receiptHTML);
    iframeDoc.close();

    // Print after content loads
    iframe.onload = () => {
      // Small delay to ensure styles render
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();

        // Remove iframe after printing
        // setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    };
  } else {
    console.error('Failed to create print frame');
  }
};

/**
 * Create receipt data from transaction result
 */
export const createReceiptData = (
  txData: any,
  inventory: InventoryItem[]
): ReceiptData => {
  const sourceItem = inventory.find(i => i.id === txData.sourceId);

  return {
    transaction: {
      type: txData.type,
      product: txData.product,
      volume: txData.volume,
      referenceDoc: txData.refDoc || txData.referenceDoc || 'N/A',
      customerName: txData.customerName,
      timestamp: new Date().toISOString(),
      performedBy: txData.performedBy || 'System',
      status: txData.status || 'APPROVED'
    },
    location: sourceItem?.location || 'Unknown Location'
  };
};
