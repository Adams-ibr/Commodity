import React from 'react';
import { InventoryItem } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Droplet } from 'lucide-react';

interface InventoryStatsProps {
  items: InventoryItem[];
}

export const InventoryStats: React.FC<InventoryStatsProps> = ({ items }) => {
  const data = items.map(item => ({
    name: item.location.split('-')[1]?.trim() || item.location,
    volume: item.currentVolume,
    capacity: item.maxCapacity,
    product: item.product,
    fillPercentage: (item.currentVolume / item.maxCapacity) * 100
  }));

  const getBarColor = (percent: number) => {
    if (percent < 20) return '#ef4444'; // Red
    if (percent > 85) return '#f59e0b'; // Amber (near full)
    return '#3b82f6'; // Blue
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-cyan-600" />
          Tank Levels & Utilization
        </h3>
        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
          Real-time readings
        </span>
      </div>
      
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
            <Tooltip 
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend />
            <Bar dataKey="volume" name="Current Volume (L)" radius={[4, 4, 0, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.fillPercentage)} />
              ))}
            </Bar>
            <Bar dataKey="capacity" name="Max Capacity (L)" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {items.map(item => (
          <div key={item.id} className="p-4 bg-slate-50 rounded border border-slate-100 flex flex-col">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-slate-700">{item.product}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${item.status === 'Low' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {item.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-1">{item.location}</div>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${item.status === 'Low' ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${(item.currentVolume / item.maxCapacity) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-600 font-mono">
              <span>{item.currentVolume.toLocaleString()} L</span>
              <span className="text-slate-400">/ {item.maxCapacity.toLocaleString()} L</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};