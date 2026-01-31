import React from 'react';
import { UserRole, User } from '../types';
import { Shield, Warehouse, Store, ClipboardList, Scale, MapPin } from 'lucide-react';

interface SignInProps {
  onLogin: (user: User) => void;
}

const ROLES_CONFIG = [
  { 
    role: UserRole.SUPER_ADMIN, 
    label: 'Super Admin',
    name: 'Sarah Connor',
    location: 'HQ - Abuja',
    icon: Shield,
    color: 'bg-red-100 text-red-700',
    description: 'Full system control & config'
  },
  { 
    role: UserRole.DEPOT_MANAGER, 
    label: 'Depot Manager',
    name: 'John Depot',
    location: 'Lagos Depot',
    icon: Warehouse,
    color: 'bg-blue-100 text-blue-700',
    description: 'Inventory approvals & oversight'
  },
  { 
    role: UserRole.STATION_MANAGER, 
    label: 'Station Manager',
    name: 'Mike Station',
    location: 'Abuja Station 5',
    icon: Store,
    color: 'bg-green-100 text-green-700',
    description: 'Station inventory management'
  },
  { 
    role: UserRole.INVENTORY_OFFICER, 
    label: 'Inventory Officer',
    name: 'Alex Stock',
    location: 'Lagos Depot',
    icon: ClipboardList,
    color: 'bg-amber-100 text-amber-700',
    description: 'Record stock movements'
  },
  { 
    role: UserRole.AUDITOR, 
    label: 'Auditor',
    name: 'Linda Audit',
    location: 'NUPRC External',
    icon: Scale,
    color: 'bg-purple-100 text-purple-700',
    description: 'View-only compliance access'
  }
];

export const SignIn: React.FC<SignInProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
             <div className="w-20 h-20 bg-indigo-900 rounded-2xl flex items-center justify-center shadow-xl">
                <Shield className="w-10 h-10 text-white" />
             </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Marhaba Gas Limited</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Secure Inventory Management System for the Downstream Oil & Gas Sector.
            <br />
            Select a verified profile to access the secure environment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLES_CONFIG.map((profile) => (
            <button
              key={profile.role}
              onClick={() => onLogin({ name: profile.name, role: profile.role, location: profile.location })}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 text-left group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <profile.icon className="w-24 h-24" />
              </div>
              
              <div className="relative z-10 flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${profile.color} group-hover:scale-110 transition-transform shadow-sm`}>
                  <profile.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors text-lg">
                    {profile.label}
                  </h3>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mt-1 mb-2">
                    {profile.role}
                  </p>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-slate-600 font-medium">{profile.name}</p>
                    <div className="flex items-center text-xs text-slate-500">
                      <MapPin className="w-3 h-3 mr-1" />
                      {profile.location}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 relative z-10">
                <p className="text-xs text-slate-400 italic">
                  "{profile.description}"
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-16 text-center border-t border-slate-200 pt-8">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                Protected by Enterprise Grade Security • ISO 27001 Compliant
            </p>
            <p className="text-xs text-slate-400 mt-2">
                Unauthorized access is a criminal offense under the NUPRC Cyber-Security Guidelines.
            </p>
        </div>
      </div>
    </div>
  );
};