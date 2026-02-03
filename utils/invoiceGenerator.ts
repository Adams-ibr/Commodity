/**
 * Invoice and Receipt Number Generator
 * 
 * Generates auto-incrementing invoice/receipt numbers with the format:
 * - Invoice: INV-YYYYMMDD-NNNN (e.g., INV-20260203-0001)
 * - Receipt: RCP-YYYYMMDD-NNNN (e.g., RCP-20260203-0001)
 * 
 * The sequence counter resets automatically when the date changes (24-hour reset).
 */

const INVOICE_COUNTER_KEY = 'galaltix_invoice_counter';
const RECEIPT_COUNTER_KEY = 'galaltix_receipt_counter';

interface CounterData {
    date: string;
    counter: number;
}

/**
 * Get today's date in YYYYMMDD format
 */
const getTodayDateString = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
};

/**
 * Get or initialize counter data from localStorage
 * Resets counter if the date has changed
 */
const getCounterData = (key: string): CounterData => {
    const today = getTodayDateString();

    try {
        const stored = localStorage.getItem(key);
        if (stored) {
            const data: CounterData = JSON.parse(stored);
            // Check if date matches today - if not, reset counter
            if (data.date === today) {
                return data;
            }
        }
    } catch (e) {
        console.warn('Error reading counter from localStorage:', e);
    }

    // Return fresh counter for today
    return { date: today, counter: 0 };
};

/**
 * Save counter data to localStorage
 */
const saveCounterData = (key: string, data: CounterData): void => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Error saving counter to localStorage:', e);
    }
};

/**
 * Generate the next invoice number
 * Format: INV-YYYYMMDD-NNNN
 * 
 * @returns The next invoice number in sequence
 */
export const getNextInvoiceNumber = (): string => {
    const data = getCounterData(INVOICE_COUNTER_KEY);
    const nextCounter = data.counter + 1;

    // Save updated counter
    saveCounterData(INVOICE_COUNTER_KEY, {
        date: data.date,
        counter: nextCounter
    });

    // Format: INV-YYYYMMDD-NNNN (4 digit padded number)
    const paddedCounter = String(nextCounter).padStart(4, '0');
    return `INV-${data.date}-${paddedCounter}`;
};

/**
 * Generate the next receipt number
 * Format: RCP-YYYYMMDD-NNNN
 * 
 * @returns The next receipt number in sequence
 */
export const getNextReceiptNumber = (): string => {
    const data = getCounterData(RECEIPT_COUNTER_KEY);
    const nextCounter = data.counter + 1;

    // Save updated counter
    saveCounterData(RECEIPT_COUNTER_KEY, {
        date: data.date,
        counter: nextCounter
    });

    // Format: RCP-YYYYMMDD-NNNN (4 digit padded number)
    const paddedCounter = String(nextCounter).padStart(4, '0');
    return `RCP-${data.date}-${paddedCounter}`;
};

/**
 * Preview the next invoice number without incrementing
 * Useful for displaying in the UI before confirming
 */
export const previewNextInvoiceNumber = (): string => {
    const data = getCounterData(INVOICE_COUNTER_KEY);
    const nextCounter = data.counter + 1;
    const paddedCounter = String(nextCounter).padStart(4, '0');
    return `INV-${data.date}-${paddedCounter}`;
};

/**
 * Preview the next receipt number without incrementing
 * Useful for displaying in the UI before confirming
 */
export const previewNextReceiptNumber = (): string => {
    const data = getCounterData(RECEIPT_COUNTER_KEY);
    const nextCounter = data.counter + 1;
    const paddedCounter = String(nextCounter).padStart(4, '0');
    return `RCP-${data.date}-${paddedCounter}`;
};
