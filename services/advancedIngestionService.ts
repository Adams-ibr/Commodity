import * as XLSX from 'xlsx';
import { COLLECTIONS, dbCreate, dbCreateBulk, dbList, Query } from './supabaseDb';

/**
 * Specialized Excel Ingestion Engine for Commodity ERP
 */

export type SheetType =
    | 'CONTRACT'
    | 'PROCUREMENT'
    | 'PROCESSING'
    | 'TRUCKING'
    | 'STUFFING'
    | 'DELIVERY'
    | 'COMPLIANCE'
    | 'FX'
    | 'UNKNOWN';

export interface IngestionError {
    sheet: string;
    row: number;
    message: string;
    data?: any;
}

export interface IngestionResult {
    processed_sheets: string[];
    created_records: Record<string, number>;
    errors: IngestionError[];
}

const ORDERED_SHEET_TYPES: SheetType[] = [
    'CONTRACT',
    'PROCUREMENT',
    'PROCESSING',
    'TRUCKING',
    'STUFFING',
    'DELIVERY',
    'COMPLIANCE',
    'FX'
];

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class AdvancedIngestionService {
    private cache: Record<string, Map<string, string>> = {};
    private errors: IngestionError[] = [];
    private createdCount: Record<string, number> = {};

    constructor() {
        this.cache = {};
        this.errors = [];
        this.createdCount = {};
    }

    /**
     * Main entry point for workbook ingestion
     */
    async processWorkbook(workbook: XLSX.WorkBook): Promise<IngestionResult> {
        this.errors = [];
        this.createdCount = {};
        const classifiedSheets: Map<SheetType, { name: string, data: any[] }> = new Map();

        // 1. Initial Load & Classification & Normalization
        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

            if (rawData.length === 0) continue;

            const normalized = this.normalizeSheet(sheetName, rawData);
            if (normalized.data.length === 0) continue;

            const type = this.classifySheet(sheetName, normalized.headers);
            if (type !== 'UNKNOWN') {
                classifiedSheets.set(type, { name: sheetName, data: normalized.data });
            }
        }

        // 2. Load References for Cross-Sheet Linking
        await this.preloadReferences();

        // 3. Staged Processing
        for (const type of ORDERED_SHEET_TYPES) {
            const sheet = classifiedSheets.get(type);
            if (!sheet) continue;

            try {
                await this.processSheetData(type, sheet.data, sheet.name);
            } catch (err: any) {
                this.logError(sheet.name, 0, `Failed to process sheet: ${err.message}`);
            }
        }

        return {
            processed_sheets: Array.from(classifiedSheets.values()).map(s => s.name),
            created_records: this.createdCount,
            errors: this.errors
        };
    }

    /**
     * Detects header row, removes title rows, cleans labels, and filters empty rows
     */
    private normalizeSheet(sheetName: string, rawData: any[][]): { headers: string[], data: any[] } {
        const keywordMap = [
            'date', 'contract', 'batch', 'supplier', 'buyer', 'container', 'truck', 'driver',
            'qty', 'weight', 'price', 'rate', 'vessel', 'booking', 'port', 'compliance', 'fx'
        ];

        let headerIndex = -1;

        // Find header row: the first row that has at least 2 keyword matches
        for (let i = 0; i < Math.min(15, rawData.length); i++) {
            const row = rawData[i];
            if (!Array.isArray(row)) continue;

            const matchCount = row.filter(cell => {
                if (!cell) return false;
                const normalizedCell = String(cell).toLowerCase();
                return keywordMap.some(kw => normalizedCell.includes(kw));
            }).length;

            if (matchCount >= 2) {
                headerIndex = i;
                break;
            }
        }

        if (headerIndex === -1) return { headers: [], data: [] };

        const headers = (rawData[headerIndex] as any[]).map(h => this.cleanHeader(String(h || '')));
        const dataRows = rawData.slice(headerIndex + 1);

        const normalizedData = dataRows
            .map(row => {
                const rowObj: any = {};
                headers.forEach((h, idx) => {
                    if (h) rowObj[h] = row[idx];
                });
                return rowObj;
            })
            // Filter out empty rows (where all values matching headers are null/empty)
            .filter(rowObj => Object.values(rowObj).some(val => val !== undefined && val !== null && val !== ''));

        return { headers, data: normalizedData };
    }

    private cleanHeader(h: string): string {
        return h.trim().toLowerCase()
            .replace(/[^a-z0-9\s_]/g, '')
            .replace(/\s+/g, '_');
    }

    /**
     * Classifies sheet based on name and header keywords
     */
    private classifySheet(sheetName: string, headers: string[]): SheetType {
        const name = sheetName.toLowerCase();
        const headerStr = headers.join(' ');

        if (name.includes('contract') || (headerStr.includes('contract_date') && headerStr.includes('buyer'))) return 'CONTRACT';
        if (name.includes('procurement') || name.includes('purchase') || (headerStr.includes('supplier') && headerStr.includes('received_weight'))) return 'PROCUREMENT';
        if (name.includes('process') || (headerStr.includes('cleaning') || headerStr.includes('sorting'))) return 'PROCESSING';
        if (name.includes('truck') || (headerStr.includes('truck_number') && headerStr.includes('driver'))) return 'TRUCKING';
        if (name.includes('stuff') || (headerStr.includes('container_number') && headerStr.includes('stuffing'))) return 'STUFFING';
        if (name.includes('delivery') || name.includes('shipment') || headerStr.includes('vessel')) return 'DELIVERY';
        if (name.includes('compliance') || headerStr.includes('form_m') || headerStr.includes('nxp')) return 'COMPLIANCE';
        if (name.includes('fx') || headerStr.includes('exchange_rate')) return 'FX';

        return 'UNKNOWN';
    }

    /**
     * Process data based on classification
     */
    private async processSheetData(type: SheetType, data: any[], sheetName: string) {
        console.log(`Processing ${type} sheet: ${sheetName} with ${data.length} rows`);

        switch (type) {
            case 'CONTRACT':
                await this.processSalesContracts(data, sheetName);
                break;
            case 'PROCUREMENT':
                await this.processPurchaseContracts(data, sheetName);
                break;
            case 'PROCESSING':
                await this.processProcessingOrders(data, sheetName);
                break;
            case 'TRUCKING':
                await this.processTrucking(data, sheetName);
                break;
            case 'STUFFING':
                await this.processStuffing(data, sheetName);
                break;
            case 'DELIVERY':
                await this.processShipments(data, sheetName);
                break;
            case 'COMPLIANCE':
                await this.processCompliance(data, sheetName);
                break;
            case 'FX':
                await this.processFX(data, sheetName);
                break;
            default:
                console.warn(`Handler for ${type} not recognized.`);
        }
    }

    private async processSalesContracts(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const buyerId = this.resolveId(COLLECTIONS.BUYERS, row.buyer || row.customer);
            const commodityId = this.resolveId(COLLECTIONS.COMMODITY_TYPES, row.commodity || row.type);

            if (!row.contract_number) {
                this.logError(sheetName, i + 1, 'Missing contract number');
                continue;
            }

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                contract_number: row.contract_number,
                buyer_id: buyerId,
                commodity_type_id: commodityId,
                contract_date: this.parseDate(row.date),
                contracted_quantity: this.parseNumber(row.quantity || row.weight || row.tons),
                price_per_ton: this.parseNumber(row.price || row.rate),
                currency: row.currency || 'USD',
                status: 'ACTIVE'
            };

            const { data: result, error } = await dbCreate(COLLECTIONS.SALES_CONTRACTS, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else {
                this.incrementCreated(COLLECTIONS.SALES_CONTRACTS);
                this.cache[COLLECTIONS.SALES_CONTRACTS].set(this.normalizeId(row.contract_number), (result as any).id);
            }
        }
    }

    private async processPurchaseContracts(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const supplierId = this.resolveId(COLLECTIONS.SUPPLIERS, row.supplier || row.vendor);
            const commodityId = this.resolveId(COLLECTIONS.COMMODITY_TYPES, row.commodity || row.type);

            if (!row.contract_number && !row.po_number) {
                this.logError(sheetName, i + 1, 'Missing contract/PO number');
                continue;
            }

            const contractNum = row.contract_number || row.po_number;

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                contract_number: contractNum,
                supplier_id: supplierId,
                commodity_type_id: commodityId,
                contract_date: this.parseDate(row.date),
                contracted_quantity: this.parseNumber(row.quantity || row.weight || row.contract_givenmt),
                price_per_ton: this.parseNumber(row.price || row.rate),
                currency: row.currency || 'NGN',
                status: 'ACTIVE'
            };

            const { data: result, error } = await dbCreate(COLLECTIONS.PURCHASE_CONTRACTS, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else {
                this.incrementCreated(COLLECTIONS.PURCHASE_CONTRACTS);
                this.cache[COLLECTIONS.PURCHASE_CONTRACTS].set(this.normalizeId(contractNum), (result as any).id);

                // Also create a batch for this procurement
                await dbCreate(COLLECTIONS.COMMODITY_BATCHES, {
                    company_id: DEFAULT_COMPANY_ID,
                    batch_number: `BATCH-${contractNum}-${Date.now()}`,
                    purchase_contract_id: (result as any).id,
                    commodity_type_id: commodityId,
                    supplier_id: supplierId,
                    received_weight: payload.contracted_quantity,
                    current_weight: payload.contracted_quantity,
                    status: 'RECEIVED'
                });
                this.incrementCreated(COLLECTIONS.COMMODITY_BATCHES);
            }
        }
    }

    private async processProcessingOrders(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const locationId = this.resolveId(COLLECTIONS.LOCATIONS, row.plant || row.location);

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                order_number: row.order_number || `PROC-${Date.now()}-${i}`,
                processing_plant_id: locationId,
                order_date: this.parseDate(row.date),
                processing_type: (row.type || 'CLEANING').toUpperCase(),
                status: 'COMPLETED',
                total_processing_cost: this.parseNumber(row.cost || row.total_cost),
                notes: row.notes || row.remarks
            };

            const { error } = await dbCreate(COLLECTIONS.PROCESSING_ORDERS, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else this.incrementCreated(COLLECTIONS.PROCESSING_ORDERS);
        }
    }

    private async processTrucking(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const batchId = this.resolveId(COLLECTIONS.COMMODITY_BATCHES, row.batch_number || row.batch);

            if (!batchId) {
                this.logError(sheetName, i + 1, `Batch ${row.batch_number || row.batch} not found for trucking`);
                continue;
            }

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                batch_id: batchId,
                movement_type: 'TRANSFER',
                truck_number: row.truck_number || row.truck,
                driver_name: row.driver_name || row.driver,
                driver_phone: row.driver_phone,
                quantity: this.parseNumber(row.quantity || row.weight),
                movement_date: this.parseDate(row.date),
                transit_status: 'DELIVERED'
            };

            const { error } = await dbCreate(COLLECTIONS.BATCH_MOVEMENTS, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else this.incrementCreated(COLLECTIONS.BATCH_MOVEMENTS);
        }
    }

    private async processShipments(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const contractId = this.resolveId(COLLECTIONS.SALES_CONTRACTS, row.contract_number || row.contract);

            if (!row.booking_ref && !row.vessel) {
                this.logError(sheetName, i + 1, 'Missing booking ref or vessel name');
                continue;
            }

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                shipment_number: row.shipment_number || `SHIP-${row.booking_ref || 'UNK'}-${Date.now()}`,
                sales_contract_id: contractId,
                vessel_name: row.vessel || row.vessel_name,
                booking_ref: row.booking_ref || row.booking,
                loading_port: row.port || row.loading_port,
                destination_port: row.destination || row.destination_port,
                actual_departure: this.parseDate(row.departure_date || row.date),
                status: 'SHIPPED'
            };

            const { data: result, error } = await dbCreate(COLLECTIONS.SHIPMENTS, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else {
                this.incrementCreated(COLLECTIONS.SHIPMENTS);
                if (row.booking_ref) this.cache[COLLECTIONS.SHIPMENTS].set(this.normalizeId(row.booking_ref), (result as any).id);
            }
        }
    }

    private async processCompliance(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const shipmentId = this.resolveId(COLLECTIONS.SHIPMENTS, row.booking_ref || row.shipment);

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                shipment_id: shipmentId,
                nxp_form_number: row.nxp || row.nxp_form,
                nepc_registration: row.nepc,
                compliance_status: 'COMPLIANT'
            };

            const { error } = await dbCreate(COLLECTIONS.EXPORT_COMPLIANCE, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else this.incrementCreated(COLLECTIONS.EXPORT_COMPLIANCE);
        }
    }

    private async processFX(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);

            const payload = {
                company_id: DEFAULT_COMPANY_ID,
                from_currency: row.from_currency || 'USD',
                to_currency: row.to_currency || 'NGN',
                rate: this.parseNumber(row.rate || row.exchange_rate),
                rate_date: this.parseDate(row.date),
                source: row.source || 'MANUAL'
            };

            const { error } = await dbCreate(COLLECTIONS.EXCHANGE_RATES, payload);
            if (error) this.logError(sheetName, i + 1, error);
            else this.incrementCreated(COLLECTIONS.EXCHANGE_RATES);
        }
    }

    /**
     * Critical Stuffing Logic
     */
    private async processStuffing(data: any[], sheetName: string) {
        for (let i = 0; i < data.length; i++) {
            const row = this.transformRow(data[i]);
            const containerNum = row.container_number || row.container;
            const bags = this.parseNumber(row.bags || row.qty_bags);
            const batchNum = row.batch_number || row.batch;
            const bookingRef = row.booking_ref || row.booking;

            if (!containerNum || !batchNum) {
                this.logError(sheetName, i + 1, 'Missing container or batch number');
                continue;
            }

            try {
                // 1. Create or Find Shipment (by booking ref)
                let shipmentId = this.cache[COLLECTIONS.SHIPMENTS]?.get(this.normalizeId(bookingRef));
                if (!shipmentId && bookingRef) {
                    const { data: newShipment } = await dbCreate(COLLECTIONS.SHIPMENTS, {
                        company_id: DEFAULT_COMPANY_ID,
                        shipment_number: `SHIP-${bookingRef}-${Date.now()}`,
                        booking_ref: bookingRef,
                        status: 'LOADING'
                    });
                    shipmentId = (newShipment as any).id;
                    this.cache[COLLECTIONS.SHIPMENTS]?.set(this.normalizeId(bookingRef), shipmentId!);
                    this.incrementCreated(COLLECTIONS.SHIPMENTS);
                }

                // 2. Resolve Batch ID
                const batchId = this.resolveId(COLLECTIONS.COMMODITY_BATCHES, batchNum);
                if (!batchId) {
                    this.logError(sheetName, i + 1, `Batch ${batchNum} not found`);
                    continue;
                }

                // 3. Insert ShipmentBatch (Container Loading Record)
                const { error } = await dbCreate(COLLECTIONS.SHIPMENT_BATCHES, {
                    shipment_id: shipmentId,
                    batch_id: batchId,
                    container_number: containerNum,
                    allocated_quantity: bags
                });

                if (error) this.logError(sheetName, i + 1, error);
                else this.incrementCreated(COLLECTIONS.SHIPMENT_BATCHES);

            } catch (err: any) {
                this.logError(sheetName, i + 1, err.message);
            }
        }
    }

    private transformRow(row: any): Record<string, any> {
        const result: Record<string, any> = {};
        for (const key in row) {
            result[key] = row[key];
        }
        return result;
    }

    private resolveId(table: string, value: any): string | undefined {
        if (!value) return undefined;
        return this.cache[table]?.get(this.normalizeId(value));
    }

    private parseNumber(val: any): number {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return Number(String(val).replace(/[^0-9.-]+/g, ''));
    }

    private parseDate(val: any): string {
        if (!val) return new Date().toISOString().split('T')[0];
        if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }
        try {
            const d = new Date(val);
            if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
            return d.toISOString().split('T')[0];
        } catch {
            return new Date().toISOString().split('T')[0];
        }
    }

    private async preloadReferences() {
        const tables = [
            COLLECTIONS.COMMODITY_BATCHES,
            COLLECTIONS.SHIPMENTS,
            COLLECTIONS.PURCHASE_CONTRACTS,
            COLLECTIONS.SALES_CONTRACTS,
            COLLECTIONS.SUPPLIERS,
            COLLECTIONS.BUYERS
        ];

        for (const table of tables) {
            const { data } = await dbList(table, [Query.limit(2000)]);
            const map = new Map<string, string>();
            (data || []).forEach((item: any) => {
                const key = item.batch_number || item.booking_ref || item.contract_number || item.name || item.id;
                if (key) map.set(this.normalizeId(key), item.id);
            });
            this.cache[table] = map;
        }
    }

    private normalizeId(s: any): string {
        return String(s || '').toLowerCase().trim();
    }

    private logError(sheet: string, row: number, message: string, data?: any) {
        this.errors.push({ sheet, row, message, data });
    }

    private incrementCreated(table: string, count: number = 1) {
        this.createdCount[table] = (this.createdCount[table] || 0) + count;
    }
}

export const advancedIngestionService = new AdvancedIngestionService();
