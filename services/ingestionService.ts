import * as XLSX from 'xlsx';
import { dbCreateBulk, dbList, dbCreate, COLLECTIONS, Query } from './supabaseDb';

export interface IngestionField {
    name: string;
    label: string;
    required?: boolean;
    type?: 'string' | 'number' | 'date' | 'boolean' | 'json';
    aliases?: string[];
    options?: string[];
    defaultValue?: any;
    resolveFrom?: string; // Table name to resolve name -> id
    autoCreate?: boolean; // If true, create missing reference instead of failing
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
            { name: 'category_name', label: 'Commodity Category', aliases: ['Category', 'Group', 'Class'] },
            { name: 'commodity_type_id', label: 'Commodity Type', required: true, resolveFrom: COLLECTIONS.COMMODITY_TYPES, autoCreate: true, aliases: ['Commodity', 'Type', 'Item', 'Product'] },
            { name: 'supplier_id', label: 'Supplier', required: true, resolveFrom: COLLECTIONS.SUPPLIERS, aliases: ['Vendor', 'Farmer', 'Supplier Name'] },
            { name: 'purchase_contract_id', label: 'Purchase Contract', resolveFrom: COLLECTIONS.PURCHASE_CONTRACTS, aliases: ['Contract #', 'Contract Number', 'PO Number', 'Purchase Contract', 'SOYA CONTRACTS', 'CASHEW CONTRACTS', 'SESAME CONTRACTS'] },
            { name: 'location_id', label: 'Location', required: true, resolveFrom: COLLECTIONS.LOCATIONS, aliases: ['Warehouse', 'Storage', 'Origin', 'Location Name'] },
            { name: 'received_date', label: 'Received Date', required: true, type: 'date', aliases: ['Date', 'ReceivedAt', 'Contract Date'] },
            { name: 'received_weight', label: 'Received Weight', required: true, type: 'number', aliases: ['Weight', 'Qty', 'Quantity', 'Net Weight', 'Gross Weight', 'Tons', 'Metric Tons', 'Contract Given(MT)'] },
            { name: 'current_weight', label: 'Current Weight', required: true, type: 'number', aliases: ['Current Qty', 'Remaining Weight', 'Stock Qty'] },
            { name: 'cost_per_ton', label: 'Cost Per Ton', type: 'number', aliases: ['Price', 'Rate', 'Unit Cost', 'Buying Price', 'Price/KG'] },
            { name: 'currency', label: 'Currency', defaultValue: 'NGN', aliases: ['Curr', 'Currency Code'] },
            { name: 'truck_number', label: 'Truck Number', aliases: ['Truck', 'Vehicle'] },
            { name: 'driver_name', label: 'Driver Name', aliases: ['Driver'] },
            { name: 'grade', label: 'Grade', aliases: ['Quality'] },
            { name: 'notes', label: 'Notes', aliases: ['Remarks', 'Description', 'Remark'] },
        ]
    },
    [COLLECTIONS.PURCHASE_CONTRACTS]: {
        label: 'Purchase Contracts',
        fields: [
            { name: 'contract_number', label: 'Contract Number', required: true, aliases: ['Contract #', 'PO Number', 'ContractNo', 'SOYA CONTRACTS', 'CASHEW CONTRACTS', 'SESAME CONTRACTS'] },
            { name: 'supplier_id', label: 'Supplier', required: true, resolveFrom: COLLECTIONS.SUPPLIERS, aliases: ['Vendor', 'Farmer', 'Supplier Name'] },
            { name: 'commodity_type_id', label: 'Commodity Type', required: true, resolveFrom: COLLECTIONS.COMMODITY_TYPES, aliases: ['Commodity', 'Type', 'Item'] },
            { name: 'contract_date', label: 'Contract Date', required: true, type: 'date', aliases: ['Date'] },
            { name: 'contracted_quantity', label: 'Quantity', required: true, type: 'number', aliases: ['Qty', 'Tons', 'Weight', 'Contract Given(MT)'] },
            { name: 'price_per_ton', label: 'Price Per Ton', required: true, type: 'number', aliases: ['Rate', 'Price', 'Price/KG'] },
            { name: 'total_value', label: 'Total Value', type: 'number', aliases: ['Total Sum', 'Cost (Millions)', 'Total Cost'] },
            { name: 'currency', label: 'Currency', defaultValue: 'NGN' },
            { name: 'status', label: 'Status', defaultValue: 'DRAFT', options: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
            { name: 'notes', label: 'Notes', aliases: ['Remarks', 'Description', 'Remark'] },
        ]
    },
    [COLLECTIONS.SALES_CONTRACTS]: {
        label: 'Sales Contracts',
        fields: [
            { name: 'contract_number', label: 'Contract Number', required: true, aliases: ['Contract #', 'Sales Order', 'SO Number'] },
            { name: 'buyer_id', label: 'Buyer', required: true, resolveFrom: COLLECTIONS.BUYERS, aliases: ['Customer', 'Client'] },
            { name: 'commodity_type_id', label: 'Commodity Type', required: true, resolveFrom: COLLECTIONS.COMMODITY_TYPES, aliases: ['Commodity', 'Type'] },
            { name: 'contract_date', label: 'Contract Date', required: true, type: 'date', aliases: ['Date'] },
            { name: 'contracted_quantity', label: 'Quantity', required: true, type: 'number', aliases: ['Qty', 'Tons', 'Weight'] },
            { name: 'price_per_ton', label: 'Price Per Ton', required: true, type: 'number', aliases: ['Rate', 'Price'] },
            { name: 'currency', label: 'Currency', defaultValue: 'USD' },
            { name: 'status', label: 'Status', defaultValue: 'DRAFT', options: ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
        ]
    },
    [COLLECTIONS.SUPPLIERS]: {
        label: 'Suppliers/Farmers',
        fields: [
            { name: 'name', label: 'Name', required: true, aliases: ['Supplier Name', 'Farmer Name', 'Full Name'] },
            { name: 'type', label: 'Type', required: true, options: ['FARMER', 'AGGREGATOR', 'COOPERATIVE'], defaultValue: 'FARMER' },
            { name: 'email', label: 'Email', aliases: ['Email Address', 'Mail'] },
            { name: 'phone', label: 'Phone', aliases: ['Phone Number', 'Contact', 'Mobile'] },
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
    private cache: Record<string, Map<string, string>> = {};

    /**
     * Normalize strings for comparison
     */
    private normalize(s: string): string {
        return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    }

    /**
     * Parse an Excel/CSV file and automatically find the best header row
     */
    async parseFile(file: File, schemaKey?: string): Promise<{ columns: string[], data: any[] }> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    if (jsonData.length === 0) {
                        resolve({ columns: [], data: [] });
                        return;
                    }

                    // Smart Header Detection: Find the row with the most column matches for the schema
                    let headerIndex = 0;
                    if (schemaKey) {
                        const schema = INGESTION_SCHEMAS[schemaKey];
                        const aliases = schema.fields.flatMap(f => [f.name, f.label, ...(f.aliases || [])].map(a => this.normalize(a)));

                        let maxMatches = -1;
                        // Search first 10 rows
                        const searchLimit = Math.min(10, jsonData.length);
                        for (let i = 0; i < searchLimit; i++) {
                            const row = jsonData[i];
                            const matches = row.filter(cell => cell && aliases.includes(this.normalize(String(cell)))).length;
                            if (matches > maxMatches) {
                                maxMatches = matches;
                                headerIndex = i;
                            }
                        }
                    }

                    const columns = (jsonData[headerIndex] as any[]).map(c => String(c || '').trim());
                    // Filter out rows before header and the header row itself
                    const rows = jsonData.slice(headerIndex + 1).map((row: any) => {
                        const rowObj: any = {};
                        columns.forEach((col, index) => {
                            if (col) rowObj[col] = row[index];
                        });
                        return rowObj;
                    });

                    resolve({ columns: columns.filter(Boolean), data: rows });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Suggest mapping based on field names and aliases
     */
    suggestMapping(columns: string[], schemaKey: string): FieldMapping[] {
        const schema = INGESTION_SCHEMAS[schemaKey];
        if (!schema) return [];

        return schema.fields.map(field => {
            const normalizedField = this.normalize(field.name);
            const normalizedLabel = this.normalize(field.label);
            const normalizedAliases = (field.aliases || []).map(a => this.normalize(a));

            const match = columns.find(col => {
                const normalizedCol = this.normalize(col);
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
     * Load reference data for identifier resolution
     */
    async loadReferences(schemaKey: string) {
        const schema = INGESTION_SCHEMAS[schemaKey];
        if (!schema) return;

        for (const field of schema.fields) {
            if (field.resolveFrom && !this.cache[field.resolveFrom]) {
                console.log(`Loading references for ${field.resolveFrom}...`);
                const { data } = await dbList(field.resolveFrom, [Query.limit(1000)]);
                const map = new Map<string, string>();
                (data || []).forEach((item: any) => {
                    if (item.name) map.set(this.normalize(item.name), item.id);
                    if (item.code) map.set(this.normalize(item.code), item.id);
                    if (item.contract_number) map.set(this.normalize(item.contract_number), item.id);
                    if (item.contract_no) map.set(this.normalize(item.contract_no), item.id);
                });
                this.cache[field.resolveFrom] = map;
            }
        }
    }

    /**
     * Prepare ingestion by provisioning missing master data (Categories, Types)
     */
    async prepareAndProvision(schemaKey: string, rawData: any[], mappings: FieldMapping[]): Promise<{ success: boolean; error?: string }> {
        const schema = INGESTION_SCHEMAS[schemaKey];
        if (!schema) return { success: true };

        // We only support auto-provisioning for commodity_batches right now
        if (schemaKey !== COLLECTIONS.COMMODITY_BATCHES) return { success: true };

        const categoryMapping = mappings.find(m => m.targetField === 'category_name');
        const typeMapping = mappings.find(m => m.targetField === 'commodity_type_id');

        if (!typeMapping || !typeMapping.sourceColumn) return { success: true };

        // Ensure categories are loaded in cache
        if (!this.cache[COLLECTIONS.COMMODITY_CATEGORIES]) {
            const { data } = await dbList(COLLECTIONS.COMMODITY_CATEGORIES);
            const map = new Map<string, string>();
            (data || []).forEach((item: any) => map.set(this.normalize(item.name), item.id));
            this.cache[COLLECTIONS.COMMODITY_CATEGORIES] = map;
        }

        const missingTypes = new Map<string, string>(); // typeName -> categoryName

        rawData.forEach(row => {
            const typeName = row[typeMapping.sourceColumn];
            if (!typeName) return;

            const normalizedType = this.normalize(typeName);
            if (!this.cache[COLLECTIONS.COMMODITY_TYPES]?.has(normalizedType)) {
                const categoryName = categoryMapping ? row[categoryMapping.sourceColumn] : 'General';
                missingTypes.set(typeName, categoryName || 'General');
            }
        });

        for (const [typeName, categoryName] of missingTypes.entries()) {
            let categoryId = this.cache[COLLECTIONS.COMMODITY_CATEGORIES].get(this.normalize(categoryName));

            if (!categoryId) {
                // Create Category
                const { data: newCat, error: catErr } = await dbCreate(COLLECTIONS.COMMODITY_CATEGORIES, {
                    company_id: DEFAULT_COMPANY_ID,
                    name: categoryName,
                    description: 'Auto-created during ingestion',
                    is_active: true
                });
                if (catErr || !newCat) return { success: false, error: `Failed to create category ${categoryName}: ${catErr}` };
                categoryId = (newCat as any).id;
                this.cache[COLLECTIONS.COMMODITY_CATEGORIES].set(this.normalize(categoryName), categoryId!);
            }

            // Create Commodity Type
            const { data: newType, error: typeErr } = await dbCreate(COLLECTIONS.COMMODITY_TYPES, {
                company_id: DEFAULT_COMPANY_ID,
                category_id: categoryId,
                name: typeName,
                code: typeName.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000),
                is_active: true
            });
            if (typeErr || !newType) return { success: false, error: `Failed to create commodity type ${typeName}: ${typeErr}` };
            this.cache[COLLECTIONS.COMMODITY_TYPES].set(this.normalize(typeName), (newType as any).id);
        }

        return { success: true };
    }

    /**
     * Map raw data to the database schema with identifier resolution
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

                // Identifier Resolution
                if (field.resolveFrom && value && typeof value === 'string' && value.length > 0) {
                    const normalizedValue = this.normalize(value);
                    const resolvedId = this.cache[field.resolveFrom]?.get(normalizedValue);
                    if (resolvedId) {
                        value = resolvedId;
                    }
                }

                // Type conversion
                if (value !== undefined && value !== null) {
                    if (field.type === 'number') {
                        value = Number(String(value).replace(/[^0-9.-]+/g, ''));
                    } else if (field.type === 'date') {
                        if (typeof value === 'number') {
                            const date = new Date((value - 25569) * 86400 * 1000);
                            value = date.toISOString().split('T')[0];
                        } else {
                            try {
                                value = new Date(value).toISOString().split('T')[0];
                            } catch (e) {
                                console.warn(`Invalid date: ${value}`);
                            }
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
     * Bulk ingest data
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
