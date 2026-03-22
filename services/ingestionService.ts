import * as XLSX from 'xlsx';
import { dbCreateBulk, COLLECTIONS } from './supabaseDb';

export interface IngestionField {
    name: string;
    label: string;
    required?: boolean;
    type?: 'string' | 'number' | 'date' | 'boolean' | 'json';
    aliases?: string[];
    options?: string[];
    defaultValue?: any;
}

export interface IngestionSchema {
    label: string;
    fields: IngestionField[];
}

export interface FieldMapping {
    sourceColumn: string;
    targetField: string;
}

export interface IngestionResult {
    success: boolean;
    count: number;
    errors: string[];
    data?: any[];
}

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export const INGESTION_SCHEMAS: Record<string, IngestionSchema> = {
    [COLLECTIONS.COMMODITY_BATCHES]: {
        label: 'Commodity Batches',
        fields: [
            { name: 'batch_number', label: 'Batch Number', required: true, aliases: ['Batch #', 'Batch No', 'BatchNo', 'Code'] },
            { name: 'commodity_type_id', label: 'Commodity Type ID', required: true, aliases: ['Commodity ID', 'Type ID'] },
            { name: 'supplier_id', label: 'Supplier ID', required: true, aliases: ['Supplier', 'Vendor ID'] },
            { name: 'location_id', label: 'Location ID', required: true, aliases: ['Warehouse ID', 'Location'] },
            { name: 'received_date', label: 'Received Date', required: true, type: 'date', aliases: ['Date', 'ReceivedAt'] },
            { name: 'received_weight', label: 'Received Weight', required: true, type: 'number', aliases: ['Weight', 'Qty', 'Quantity', 'Net Weight', 'Gross Weight', 'Tons', 'Metric Tons'] },
            { name: 'current_weight', label: 'Current Weight', required: true, type: 'number', aliases: ['Current Qty', 'Remaining Weight', 'Stock Qty'] },
            { name: 'cost_per_ton', label: 'Cost Per Ton', type: 'number', aliases: ['Price', 'Rate', 'Unit Cost', 'Buying Price'] },
            { name: 'currency', label: 'Currency', defaultValue: 'NGN', aliases: ['Curr', 'Currency Code'] },
            { name: 'truck_number', label: 'Truck Number', aliases: ['Truck', 'Vehicle'] },
            { name: 'driver_name', label: 'Driver Name', aliases: ['Driver'] },
            { name: 'grade', label: 'Grade', aliases: ['Quality'] },
            { name: 'notes', label: 'Notes', aliases: ['Remarks', 'Description'] },
        ]
    },
    [COLLECTIONS.SUPPLIERS]: {
        label: 'Suppliers/Farmers',
        fields: [
            { name: 'name', label: 'Name', required: true, aliases: ['Supplier Name', 'Farmer Name', 'Full Name'] },
            { name: 'type', label: 'Type', required: true, options: ['FARMER', 'AGGREGATOR', 'COOPERATIVE'], defaultValue: 'FARMER' },
            { name: 'email', label: 'Email', aliases: ['Email Address'] },
            { name: 'phone', label: 'Phone', aliases: ['Phone Number', 'Contact'] },
            { name: 'registration_number', label: 'Reg Number', aliases: ['RC Number', 'ID Number'] },
            { name: 'contact_person', label: 'Contact Person' },
        ]
    },
    [COLLECTIONS.BUYERS]: {
        label: 'Buyers/Customers',
        fields: [
            { name: 'name', label: 'Name', required: true, aliases: ['Buyer Name', 'Customer Name', 'Client'] },
            { name: 'type', label: 'Type', required: true, options: ['IMPORTER', 'DISTRIBUTOR', 'PROCESSOR'], defaultValue: 'IMPORTER' },
            { name: 'country', label: 'Country' },
            { name: 'email', label: 'Email' },
            { name: 'phone', label: 'Phone' },
            { name: 'preferred_currency', label: 'Currency', defaultValue: 'USD' },
        ]
    }
};

export class IngestionService {
    /**
     * Parse an Excel/CSV file into an array of objects
     */
    async parseFile(file: File): Promise<{ columns: string[], data: any[] }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length === 0) {
                        resolve({ columns: [], data: [] });
                        return;
                    }

                    const columns = (jsonData[0] as any[]).map(c => String(c || '').trim());
                    const rows = jsonData.slice(1).map((row: any) => {
                        const rowObj: any = {};
                        columns.forEach((col, index) => {
                            rowObj[col] = row[index];
                        });
                        return rowObj;
                    });

                    resolve({ columns, data: rows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Suggest mapping based on field names and aliases with robust matching
     */
    suggestMapping(columns: string[], schemaKey: string): FieldMapping[] {
        const schema = INGESTION_SCHEMAS[schemaKey];
        if (!schema) return [];

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

        return schema.fields.map(field => {
            const normalizedField = normalize(field.name);
            const normalizedLabel = normalize(field.label);
            const normalizedAliases = (field.aliases || []).map(normalize);

            const match = columns.find(col => {
                const normalizedCol = normalize(col);
                return normalizedCol === normalizedField ||
                    normalizedCol === normalizedLabel ||
                    normalizedAliases.includes(normalizedCol);
            });

            return {
                sourceColumn: match || '',
                targetField: field.name
            };
        });
    }

    /**
     * Map raw data to the database schema
     */
    transformData(rawData: any[], mappings: FieldMapping[], schemaKey: string): any[] {
        const schema = INGESTION_SCHEMAS[schemaKey];
        if (!schema) return [];

        return rawData.map(row => {
            const transformed: any = {
                company_id: DEFAULT_COMPANY_ID,
                created_at: new Date().toISOString()
            };

            schema.fields.forEach(field => {
                const mapping = mappings.find(m => m.targetField === field.name);
                let value = mapping ? row[mapping.sourceColumn] : field.defaultValue;

                if (value === undefined || value === null || value === '') {
                    value = field.defaultValue;
                }

                // Type conversion
                if (value !== undefined && value !== null) {
                    if (field.type === 'number') {
                        value = Number(String(value).replace(/[^0-9.-]+/g, ''));
                    } else if (field.type === 'date') {
                        // Handle Excel serial dates or string dates
                        if (typeof value === 'number') {
                            const date = new Date((value - 25569) * 86400 * 1000);
                            value = date.toISOString().split('T')[0];
                        } else {
                            value = new Date(value).toISOString().split('T')[0];
                        }
                    } else if (field.type === 'boolean') {
                        value = String(value).toLowerCase() === 'true' || value === 1 || String(value).toLowerCase() === 'yes';
                    }
                }

                transformed[field.name] = value;
            });

            return transformed;
        });
    }

    /**
     * Bulk ingest data into the database
     */
    async ingest(table: string, data: any[]): Promise<IngestionResult> {
        const { data: result, error } = await dbCreateBulk(table, data);

        if (error) {
            return {
                success: false,
                count: 0,
                errors: [error]
            };
        }

        return {
            success: true,
            count: result?.length || 0,
            errors: []
        };
    }
}

export const ingestionService = new IngestionService();
