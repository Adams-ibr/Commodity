import React, { useState } from 'react';
import { ProductType, TransactionType, InventoryItem, UserRole } from '../types';
import { Send, ArrowRightLeft, PlusCircle, MinusCircle, ShieldAlert } from 'lucide-react';

interface TransactionFormProps {
  inventory: InventoryItem[];
  userRole?: UserRole;
  onCommit: (data: any) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ inventory, userRole, onCommit }) => {
  const [type, setType] = useState<TransactionType>(TransactionType.SALE);
  const [product, setProduct] = useState<ProductType>(ProductType.PMS);
  const [volume, setVolume] = useState<string>('');
  const [sourceId, setSourceId] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [refDoc, setRefDoc] = useState<string>('');

  const isOfficer = userRole === UserRole.INVENTORY_OFFICER;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCommit({
      type,
      product,
      volume: Number(volume),
      sourceId,
      destination,
      refDoc,
      timestamp: new Date().toISOString()
    });
    setVolume('');
    setRefDoc('');
    setDestination('');
  };

  const getIcon = () => {
    switch(type) {
      case TransactionType.RECEIPT: return <PlusCircle className="w-5 h-5 text-green-600" />;
      case TransactionType.SALE: return <MinusCircle className="w-5 h-5 text-blue-600" />;
      case TransactionType.TRANSFER: return <ArrowRightLeft className="w-5 h-5 text-amber-600" />;
      default: return <Send className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 h-full">
      <h3 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
        {getIcon()}
        {isOfficer ? 'Draft Transaction' : 'New Transaction'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(TransactionType).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-2 text-xs font-medium rounded-md border ${
                  type === t 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
          <select 
            value={product}
            onChange={(e) => setProduct(e.target.value as ProductType)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            {Object.values(ProductType).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source Tank/Depot</label>
          <select 
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          >
            <option value="">Select Source</option>
            {inventory.filter(i => i.product === product).map((item) => (
              <option key={item.id} value={item.id}>
                {item.location} ({item.currentVolume.toLocaleString()}L available)
              </option>
            ))}
          </select>
        </div>

        {type === TransactionType.TRANSFER && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Destination Location</label>
            <input 
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. Station B - Tank 2"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Volume (Liters)</label>
          <input 
            type="number"
            min="1"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g. 5000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reference Doc (Waybill/Invoice)</label>
          <input 
            type="text"
            value={refDoc}
            onChange={(e) => setRefDoc(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g. WB-2023-001"
            required
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            className={`w-full text-white py-2.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isOfficer 
                ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {isOfficer ? 'Submit for Approval' : 'Commit Transaction'}
          </button>
          
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-400">
             <ShieldAlert className="w-3 h-3" />
             {isOfficer 
               ? 'Pending approval by Depot Manager.'
               : 'Action will be cryptographically signed.'
             }
          </div>
        </div>
      </form>
    </div>
  );
};