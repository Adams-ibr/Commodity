import { read, utils } from 'xlsx';
import { Customer, CustomerType } from '../types';

export interface ParsedCustomer extends Omit<Customer, 'id' | 'createdDate' | 'lastTransactionDate' | 'totalPurchases' | 'averageTransactionSize'> {
    // We relax strictness for the intermediate parsed object
}

export interface ParseResult {
    customers: Omit<Customer, 'id'>[];
    errors: string[];
}

const normalizeRowKeys = (row: any): any => {
    const normalized: any = {};
    Object.keys(row).forEach(key => {
        const lowerKey = key.trim().toLowerCase();
        // Map common aliases to standard keys
        if (lowerKey === 'name' || lowerKey === 'customer name' || lowerKey === 'customer') {
            normalized.Name = row[key];
        } else if (lowerKey === 'type' || lowerKey === 'customer type') {
            normalized.Type = row[key];
        } else if (lowerKey === 'phone' || lowerKey === 'phone number' || lowerKey === 'mobile' || lowerKey === 'contact') {
            normalized.Phone = row[key];
        } else if (lowerKey === 'email' || lowerKey === 'e-mail' || lowerKey === 'mail') {
            normalized.Email = row[key];
        } else if (lowerKey === 'address' || lowerKey === 'location') {
            normalized.Address = row[key];
        } else if (lowerKey === 'notes' || lowerKey === 'note' || lowerKey === 'remark') {
            normalized.Notes = row[key];
        } else {
            // Keep original key if no match found, just in case
            normalized[key] = row[key];
        }
    });
    return normalized;
};

export const parseCustomerExcel = async (file: File): Promise<ParseResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'array' }); // Use 'array' for ArrayBuffer

                // Assume data is in the first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = utils.sheet_to_json(sheet);

                const customers: Omit<Customer, 'id'>[] = [];
                const errors: string[] = [];

                if (jsonData.length === 0) {
                    resolve({ customers: [], errors: ["File appears to be empty"] });
                    return;
                }

                jsonData.forEach((rawRow: any, index) => {
                    const rowNum = index + 2; // +1 for header, +1 for 0-index
                    const row = normalizeRowKeys(rawRow);

                    // Validate required fields
                    // Check specifically for Name presence
                    if (!row.Name) {
                        // Skip completely empty rows
                        if (Object.keys(row).length === 0) return;

                        errors.push(`Row ${rowNum}: Missing 'Name' column`);
                        return;
                    }

                    let type = CustomerType.END_USER;
                    if (row.Type) {
                        const typeStr = String(row.Type).trim().toLowerCase();
                        if (typeStr === 'dealer') {
                            type = CustomerType.DEALER;
                        } else if (typeStr === 'end user' || typeStr === 'enduser' || typeStr === 'user') {
                            type = CustomerType.END_USER;
                        } else {
                            // Default to End User but warn? No, just default.
                            // errors.push(`Row ${rowNum}: Invalid Type '${row.Type}'. Defaulting to End User.`);
                        }
                    }

                    const customer: Omit<Customer, 'id'> = {
                        name: String(row.Name).trim(),
                        type: type,
                        contactInfo: {
                            phone: row.Phone ? String(row.Phone).trim() : undefined,
                            email: row.Email ? String(row.Email).trim() : undefined,
                            address: row.Address ? String(row.Address).trim() : undefined,
                        },
                        status: 'Active',
                        notes: row.Notes ? String(row.Notes).trim() : undefined,
                        totalPurchases: 0,
                        averageTransactionSize: 0,
                        createdDate: new Date().toISOString(),
                    };

                    customers.push(customer);
                });

                resolve({ customers, errors });
            } catch (error) {
                console.error("Parse Error:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
