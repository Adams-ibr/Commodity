// =====================================================
// SALES SERVICE — SUPABASE
// =====================================================
import { dbList, dbGet, dbCreate, dbUpdate, Query } from './supabaseDb';
import { COLLECTIONS } from './supabaseDb';
import {
    Buyer, BuyerType, SalesContract, ContractStatus,
    Shipment, ShipmentStatus, ApiResponse, Address,
    SalesContractItem
} from '../types_commodity';

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

export class SalesService {
    async getBuyers(companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<Buyer[]>> {
        try {
            const { data, error } = await dbList(COLLECTIONS.BUYERS, [
                Query.equal('company_id', companyId), Query.orderAsc('name')
            ]);
            if (error) return { success: false, error };
            const buyers: Buyer[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, name: item.name,
                type: item.type as BuyerType, country: item.country,
                registrationNumber: item.registration_number,
                contactPerson: item.contact_person, phone: item.phone,
                email: item.email, address: item.address ? JSON.parse(item.address) : undefined,
                bankDetails: item.bank_details ? JSON.parse(item.bank_details) : undefined,
                creditLimit: item.credit_limit, paymentTerms: item.payment_terms,
                preferredCurrency: item.preferred_currency || 'USD',
                isActive: item.is_active, createdAt: item.$createdAt, updatedAt: item.$updatedAt
            }));
            return { success: true, data: buyers };
        } catch (error) { return { success: false, error: 'Failed to fetch buyers' }; }
    }

    async createBuyer(buyerData: Omit<Buyer, 'id' | 'createdAt' | 'updatedAt'>, companyId: string = DEFAULT_COMPANY_ID): Promise<ApiResponse<Buyer>> {
        try {
            const { data, error } = await dbCreate(COLLECTIONS.BUYERS, {
                company_id: companyId, name: buyerData.name, type: buyerData.type,
                country: buyerData.country || '', registration_number: buyerData.registrationNumber || '',
                contact_person: buyerData.contactPerson || '', email: buyerData.email || '',
                phone: buyerData.phone || '', address: buyerData.address ? JSON.stringify(buyerData.address) : '',
                bank_details: buyerData.bankDetails ? JSON.stringify(buyerData.bankDetails) : '',
                credit_limit: buyerData.creditLimit || 0, payment_terms: buyerData.paymentTerms || '',
                preferred_currency: buyerData.preferredCurrency || 'USD', is_active: true
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...buyerData, id: data.$id, createdAt: data.$createdAt, updatedAt: data.$updatedAt } };
        } catch (error) { return { success: false, error: 'Failed to create buyer' }; }
    }

    async updateBuyer(id: string, buyerData: Partial<Buyer>): Promise<ApiResponse<Buyer>> {
        try {
            const payload: any = {};
            if (buyerData.name !== undefined) payload.name = buyerData.name;
            if (buyerData.type !== undefined) payload.type = buyerData.type;
            if (buyerData.country !== undefined) payload.country = buyerData.country;
            if (buyerData.registrationNumber !== undefined) payload.registration_number = buyerData.registrationNumber;
            if (buyerData.contactPerson !== undefined) payload.contact_person = buyerData.contactPerson;
            if (buyerData.email !== undefined) payload.email = buyerData.email;
            if (buyerData.phone !== undefined) payload.phone = buyerData.phone;
            if (buyerData.address !== undefined) payload.address = typeof buyerData.address === 'string' ? buyerData.address : JSON.stringify(buyerData.address);
            if (buyerData.creditLimit !== undefined) payload.credit_limit = buyerData.creditLimit;
            if (buyerData.paymentTerms !== undefined) payload.payment_terms = buyerData.paymentTerms;
            if (buyerData.preferredCurrency !== undefined) payload.preferred_currency = buyerData.preferredCurrency;

            const { data, error } = await dbUpdate(COLLECTIONS.BUYERS, id, payload);
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...buyerData, id: data.$id, createdAt: data.$createdAt, updatedAt: data.$updatedAt } as Buyer };
        } catch (error) { return { success: false, error: 'Failed to update buyer' }; }
    }

    async getSalesContracts(
        params: { companyId?: string; page?: number; limit?: number; includeItems?: boolean } = {}
    ): Promise<ApiResponse<{ data: SalesContract[]; total: number }>> {
        const { companyId = DEFAULT_COMPANY_ID, page = 1, limit = 100, includeItems = true } = params;
        const offset = (page - 1) * limit;
        try {
            const { data, total, error } = await dbList(COLLECTIONS.SALES_CONTRACTS, [
                Query.equal('company_id', companyId),
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]);
            if (error) return { success: false, error };

            const contracts: SalesContract[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, contractNumber: item.contract_number,
                buyerId: item.buyer_id, commodityTypeId: item.commodity_type_id,
                contractDate: item.contract_date,
                shipmentPeriodStart: item.shipment_period_start,
                shipmentPeriodEnd: item.shipment_period_end,
                contractedQuantity: Number(item.contracted_quantity),
                shippedQuantity: Number(item.shipped_quantity || 0),
                pricePerTon: item.price_per_ton ? Number(item.price_per_ton) : undefined,
                totalValue: item.total_value ? Number(item.total_value) : undefined,
                totalAmount: item.total_amount ? Number(item.total_amount) : undefined,
                currency: item.currency,
                incoterms: item.incoterms, destinationPort: item.destination_port,
                qualitySpecifications: item.quality_specifications ? JSON.parse(item.quality_specifications) : undefined,
                status: item.status as ContractStatus,
                createdBy: item.created_by || '', createdAt: item.$createdAt
            }));

            if (includeItems && contracts.length > 0) {
                const { data: itemsData } = await dbList(COLLECTIONS.SALES_CONTRACT_ITEMS, [
                    Query.equal('contract_id', contracts.map(c => c.id))
                ]);
                if (itemsData) {
                    contracts.forEach(c => {
                        c.items = itemsData.filter((i: any) => i.contract_id === c.id).map((i: any) => ({
                            id: i.$id, contractId: i.contract_id, commodityTypeId: i.commodity_type_id,
                            grade: i.grade, quantity: Number(i.quantity),
                            shippedQuantity: Number(i.shipped_quantity || 0),
                            unitPrice: Number(i.unit_price), currency: i.currency,
                            pricingLogic: i.pricing_logic ? JSON.parse(i.pricing_logic) : undefined,
                            specifications: i.specifications ? JSON.parse(i.specifications) : undefined,
                            createdAt: i.$createdAt, updatedAt: i.$updatedAt
                        }));
                    });
                }
            }

            return { success: true, data: { data: contracts, total: total || 0 } };
        } catch (error) { return { success: false, error: 'Failed to fetch sales contracts' }; }
    }

    async createSalesContract(
        contractData: Omit<SalesContract, 'id' | 'createdAt' | 'status' | 'shippedQuantity' | 'totalValue'>,
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<SalesContract>> {
        try {
            let totalAmount = 0;
            if (contractData.items && contractData.items.length > 0) {
                totalAmount = contractData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            } else if (contractData.contractedQuantity && contractData.pricePerTon) {
                totalAmount = Number(contractData.contractedQuantity) * Number(contractData.pricePerTon);
            }

            const { data, error } = await dbCreate(COLLECTIONS.SALES_CONTRACTS, {
                company_id: companyId, contract_number: contractData.contractNumber,
                buyer_id: contractData.buyerId, commodity_type_id: contractData.commodityTypeId,
                contract_date: contractData.contractDate,
                shipment_period_start: contractData.shipmentPeriodStart || '',
                shipment_period_end: contractData.shipmentPeriodEnd || '',
                contracted_quantity: contractData.contractedQuantity, shipped_quantity: 0,
                price_per_ton: contractData.pricePerTon || 0, total_value: totalAmount,
                total_amount: totalAmount,
                currency: contractData.currency, incoterms: contractData.incoterms || '',
                destination_port: contractData.destinationPort || '',
                quality_specifications: contractData.qualitySpecifications ? JSON.stringify(contractData.qualitySpecifications) : '',
                status: 'DRAFT', created_by: contractData.createdBy || ''
            });
            if (error || !data) return { success: false, error: error || 'Failed' };

            const contractId = data.$id;
            const createdItems: SalesContractItem[] = [];
            if (contractData.items && contractData.items.length > 0) {
                for (const item of contractData.items) {
                    const { data: itemData } = await dbCreate(COLLECTIONS.SALES_CONTRACT_ITEMS, {
                        contract_id: contractId,
                        commodity_type_id: item.commodityTypeId,
                        grade: item.grade || '',
                        quantity: item.quantity,
                        shipped_quantity: 0,
                        unit_price: item.unitPrice,
                        currency: item.currency || contractData.currency,
                        pricing_logic: item.pricingLogic ? JSON.stringify(item.pricingLogic) : null,
                        specifications: item.specifications ? JSON.stringify(item.specifications) : null
                    });
                    if (itemData) {
                        createdItems.push({
                            ...item,
                            id: itemData.$id,
                            contractId,
                            shippedQuantity: 0,
                            createdAt: itemData.$createdAt,
                            updatedAt: itemData.$updatedAt
                        });
                    }
                }
            }

            return {
                success: true,
                data: {
                    ...contractData,
                    id: contractId,
                    status: 'DRAFT' as ContractStatus,
                    shippedQuantity: 0,
                    totalValue: totalAmount,
                    totalAmount,
                    items: createdItems,
                    createdAt: data.$createdAt
                }
            };
        } catch (error) { return { success: false, error: 'Failed' }; }
    }

    async updateContractStatus(id: string, status: ContractStatus): Promise<ApiResponse<void>> {
        try {
            const { error } = await dbUpdate(COLLECTIONS.SALES_CONTRACTS, id, { status });
            if (error) return { success: false, error };
            return { success: true };
        } catch (error) { return { success: false, error: 'Failed to update status' }; }
    }

    async getShipments(
        params: { companyId?: string; page?: number; limit?: number } = {}
    ): Promise<ApiResponse<{ data: Shipment[]; total: number }>> {
        const { companyId = DEFAULT_COMPANY_ID, page = 1, limit = 100 } = params;
        const offset = (page - 1) * limit;
        try {
            const { data, total, error } = await dbList(COLLECTIONS.SHIPMENTS, [
                Query.equal('company_id', companyId),
                Query.orderDesc('$createdAt'),
                Query.limit(limit),
                Query.offset(offset)
            ]);
            if (error) return { success: false, error };
            const shipments: Shipment[] = (data || []).map((item: any) => ({
                id: item.$id, companyId: item.company_id, shipmentNumber: item.shipment_number,
                salesContractId: item.sales_contract_id, buyerId: item.buyer_id || '',
                vesselName: item.vessel_name, containerNumbers: item.container_numbers ? JSON.parse(item.container_numbers) : [],
                loadingPort: item.loading_port, destinationPort: item.destination_port,
                estimatedDeparture: item.estimated_departure, actualDeparture: item.actual_departure,
                estimatedArrival: item.estimated_arrival, actualArrival: item.actual_arrival,
                totalQuantity: Number(item.total_quantity || 0),
                totalValue: Number(item.total_value || 0), currency: item.currency,
                freightCost: item.freight_cost, insuranceCost: item.insurance_cost,
                otherCharges: item.other_charges, billOfLading: item.bill_of_lading,
                status: item.status as ShipmentStatus,
                createdBy: item.created_by || '', createdAt: item.$createdAt
            }));
            return { success: true, data: { data: shipments, total: total || 0 } };
        } catch (error) { return { success: false, error: 'Failed' }; }
    }

    async createShipment(
        shipmentData: Omit<Shipment, 'id' | 'createdAt' | 'status'>,
        companyId: string = DEFAULT_COMPANY_ID
    ): Promise<ApiResponse<Shipment>> {
        try {
            // Validate Contract is ACTIVE
            const { data: contract } = await dbGet(COLLECTIONS.SALES_CONTRACTS, shipmentData.salesContractId);
            if (!contract || contract.status !== 'ACTIVE') {
                return { success: false, error: 'Cannot create shipment for a contract that is not ACTIVE' };
            }

            const { data, error } = await dbCreate(COLLECTIONS.SHIPMENTS, {
                company_id: companyId, shipment_number: shipmentData.shipmentNumber,
                sales_contract_id: shipmentData.salesContractId, buyer_id: shipmentData.buyerId,
                vessel_name: shipmentData.vesselName || '',
                container_numbers: JSON.stringify(shipmentData.containerNumbers || []),
                loading_port: shipmentData.loadingPort || '',
                destination_port: shipmentData.destinationPort || '',
                estimated_departure: shipmentData.estimatedDeparture || '',
                estimated_arrival: shipmentData.estimatedArrival || '',
                total_quantity: shipmentData.totalQuantity || 0,
                total_value: shipmentData.totalValue || 0, currency: shipmentData.currency,
                freight_cost: shipmentData.freightCost || 0,
                insurance_cost: shipmentData.insuranceCost || 0,
                other_charges: shipmentData.otherCharges || 0,
                bill_of_lading: shipmentData.billOfLading || '',
                status: 'PLANNED', created_by: shipmentData.createdBy || ''
            });
            if (error || !data) return { success: false, error: error || 'Failed' };
            return { success: true, data: { ...shipmentData, id: data.$id, status: 'PLANNED' as ShipmentStatus, createdAt: data.$createdAt } };
        } catch (error) { return { success: false, error: 'Failed' }; }
    }
}
