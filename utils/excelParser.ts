import { read, utils } from 'xlsx';
import { Customer, CustomerType } from '../types';

export interface ParsedCustomer extends Omit<Customer, 'id' | 'createdDate' | 'lastTransactionDate' | 'totalPurchases' | 'averageTransactionSize'> {
    // We relax strictness for the intermediate parsed object
}

export interface ParseResult {
    customers: Omit<Customer, 'id'>[];
    errors: string[];
}

export const parseCustomerExcel = async (file: File): Promise<ParseResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = read(data, { type: 'binary' });

                // Assume data is in the first sheet
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const jsonData = utils.sheet_to_json(sheet);

                const customers: Omit<Customer, 'id'>[] = [];
                const errors: string[] = [];

                jsonData.forEach((row: any, index) => {
                    const rowNum = index + 2; // +1 for header, +1 for 0-index

                    // Validate required fields
                    if (!row.Name) {
                        errors.push(`Row ${rowNum}: Missing 'Name'`);
                        return;
                    }

                    let type = CustomerType.END_USER;
                    if (row.Type) {
                        const typeStr = String(row.Type).trim().toLowerCase();
                        if (typeStr === 'dealer') {
                            type = CustomerType.DEALER;
                        } else if (typeStr === 'end user' || typeStr === 'enduser') {
                            type = CustomerType.END_USER;
                        } else {
                            errors.push(`Row ${rowNum}: Invalid Type '${row.Type}'. Defaulting to End User.`);
                        }
                    }

                    const customer: Omit<Customer, 'id'> = {
                        name: row.Name,
                        type: type,
                        contactInfo: {
                            phone: row.Phone ? String(row.Phone) : undefined,
                            email: row.Email ? String(row.Email) : undefined,
                            address: row.Address ? String(row.Address) : undefined,
                        },
                        status: 'Active',
                        notes: row.Notes ? String(row.Notes) : undefined,
                        totalPurchases: 0,
                        averageTransactionSize: 0,
                        createdDate: new Date().toISOString(), // Will be overwritten by DB usually, but good for preview
                    };

                    customers.push(customer);
                });

                resolve({ customers, errors });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsBinaryString(file);
    });
};
