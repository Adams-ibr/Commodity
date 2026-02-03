import React, { useState } from 'react';
import { InventoryItem, ProductType, TransactionType } from '../types';
import { Fuel, PlusCircle, ArrowDownCircle } from 'lucide-react';
import { getNextReceiptNumber, previewNextReceiptNumber } from '../utils/invoiceGenerator';

interface RestockModuleProps {
    inventory: InventoryItem[];
    onCommitTransaction: (data: any) => void;
}

export const RestockModule: React.FC<RestockModuleProps> = ({ inventory, onCommitTransaction }) => {
    const [product, setProduct] = useState<ProductType>(ProductType.PMS);
    const [targetId, setTargetId] = useState<string>('');
    const [volume, setVolume] = useState<string>('');
    const [refDoc, setRefDoc] = useState<string>(() => previewNextReceiptNumber());

    const availableTanks = inventory.filter(i => i.product === product);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const targetTank = inventory.find(i => i.id === targetId);

        // Get the actual receipt number (this increments the counter)
        const receiptNumber = getNextReceiptNumber();

        onCommitTransaction({
            type: TransactionType.RECEIPT,
            product,
            volume: Number(volume),
            sourceId: targetId, // For receipts, we use source logic as "affected tank" in current logic, or need adjustment
            destination: targetTank?.location || 'Depot',
            refDoc: receiptNumber,
            performedBy: 'System Add' // In real app, from context
        });

        setVolume('');
        setRefDoc(previewNextReceiptNumber());
        setTargetId('');
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                    <Fuel className="w-6 h-6 text-green-700" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Receive Inventory</h2>
                    <p className="text-sm text-slate-500">Restock tanks from refinery or suppliers</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Product Type</label>
                    <div className="flex gap-2">
                        {Object.values(ProductType).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => { setProduct(p); setTargetId(''); }}
                                className={`flex-1 py-2 text-sm rounded-md border transition-colors ${product === p
                                    ? 'bg-green-50 border-green-500 text-green-700 font-medium'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {p.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Target Tank / Location</label>
                    {inventory.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                            <p className="font-medium">No inventory tanks found</p>
                            <p className="text-sm mt-1">
                                Go to <strong>Inventory Ledger</strong> first and add tanks/storage units, then come back here to restock them.
                            </p>
                        </div>
                    ) : availableTanks.length === 0 ? (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm">
                            No tanks available for <strong>{product}</strong>. Select a different product or add tanks in Inventory Ledger.
                        </div>
                    ) : (
                        <select
                            value={targetId}
                            onChange={(e) => setTargetId(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500"
                        >
                            <option value="">-- Select Tank to Fill --</option>
                            {availableTanks.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.location} (Cur: {item.currentVolume.toLocaleString()} / Max: {item.maxCapacity.toLocaleString()})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Volume to Add (L)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={volume}
                            onChange={(e) => setVolume(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-green-500"
                            placeholder="e.g. 33000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Receipt # (Auto-generated)</label>
                        <input
                            type="text"
                            readOnly
                            value={refDoc}
                            className="w-full px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-slate-700 font-mono cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Receipt number is auto-generated with today's date</p>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                    >
                        <ArrowDownCircle className="w-5 h-5" />
                        Confirm Receipt
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-2">
                        This will increase the stock level of the selected tank.
                    </p>
                </div>
            </form>
        </div>
    );
};
