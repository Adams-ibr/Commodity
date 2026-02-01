import React, { useState } from 'react';
import { UserRole } from '../types';
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, User, MapPin, ChevronDown, ArrowLeft } from 'lucide-react';

interface SignUpProps {
    onSwitchToSignIn: () => void;
    onSignUp: (email: string, password: string, name: string, role: UserRole, location: string) => Promise<string | null>;
}

const AVAILABLE_ROLES = [
    { value: UserRole.DEPOT_MANAGER, label: 'Depot Manager', description: 'Inventory approvals & oversight' },
    { value: UserRole.STATION_MANAGER, label: 'Station Manager', description: 'Station inventory management' },
    { value: UserRole.INVENTORY_OFFICER, label: 'Inventory Officer', description: 'Record stock movements' },
    { value: UserRole.AUDITOR, label: 'Auditor', description: 'View-only compliance access' }
];

const LOCATIONS = [
    'HQ - Abuja',
    'Lagos Depot',
    'Port Harcourt Depot',
    'Kaduna Depot',
    'Abuja Station 1',
    'Abuja Station 2',
    'Abuja Station 3',
    'Abuja Station 4',
    'Abuja Station 5',
    'Lagos Station 1',
    'Lagos Station 2',
    'NUPRC External'
];

export const SignUp: React.FC<SignUpProps> = ({ onSwitchToSignIn, onSignUp }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>(UserRole.INVENTORY_OFFICER);
    const [location, setLocation] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!email || !password || !name || !location) {
            setError('Please fill in all required fields.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const signUpError = await onSignUp(email, password, name, role, location);
        if (signUpError) {
            setError(signUpError);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex flex-col justify-center items-center p-6">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Create Your Account</h1>
                    <p className="text-indigo-200/80 text-sm">
                        Join Marhaba Gas Inventory System
                    </p>
                </div>

                {/* Sign Up Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="you@company.com"
                                />
                            </div>
                        </div>

                        {/* Role Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Role
                            </label>
                            <div className="relative">
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full pl-4 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                                >
                                    {AVAILABLE_ROLES.map((r) => (
                                        <option key={r.value} value={r.value} className="bg-slate-800 text-white">
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 pointer-events-none" />
                            </div>
                        </div>

                        {/* Location Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                <select
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full pl-11 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer"
                                >
                                    <option value="" className="bg-slate-800 text-indigo-300">Select your location</option>
                                    {LOCATIONS.map((loc) => (
                                        <option key={loc} value={loc} className="bg-slate-800 text-white">
                                            {loc}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300 pointer-events-none" />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Min. 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-indigo-200 mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="Re-enter password"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Create Account</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <button
                        onClick={onSwitchToSignIn}
                        className="w-full mt-4 py-3 px-4 text-indigo-200 hover:text-white font-medium transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Sign In</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
