import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, hasPermission, canManageRole, Location, ROLE_PERMISSIONS, Permission } from '../types_commodity';
import { api } from '../services/api';
import {
    Users,
    UserPlus,
    Edit2,
    Trash2,
    Shield,
    Search,
    X,
    Check,
    AlertCircle,
    ToggleLeft,
    ToggleRight,
    ChevronLeft,
    ChevronRight,
    Download,
    Key,
    Eye,
    UserCheck,
    UserX,
    Activity,
    Clock,
    Building
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
interface UserData {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    department: string;
    locationId: string;
    isActive: boolean;
    lastLogin: string | null;
    authId: string | null;
    createdAt: string;
}

interface UserManagementProps {
    currentUserRole: UserRole;
    currentUserName: string;
}

interface UserStats {
    total: number;
    active: number;
    disabled: number;
    byRole: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────
const USERS_PER_PAGE = 20;

const ROLE_COLORS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-gradient-to-r from-purple-500 to-violet-600 text-white',
    [UserRole.ADMIN]: 'bg-gradient-to-r from-red-500 to-rose-600 text-white',
    [UserRole.PROCUREMENT_MANAGER]: 'bg-blue-100 text-blue-800 border border-blue-200',
    [UserRole.QUALITY_MANAGER]: 'bg-teal-100 text-teal-800 border border-teal-200',
    [UserRole.WAREHOUSE_MANAGER]: 'bg-amber-100 text-amber-800 border border-amber-200',
    [UserRole.PRODUCTION_MANAGER]: 'bg-orange-100 text-orange-800 border border-orange-200',
    [UserRole.SALES_MANAGER]: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    [UserRole.FINANCE_MANAGER]: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    [UserRole.COMPLIANCE_OFFICER]: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    [UserRole.ACCOUNTANT]: 'bg-green-100 text-green-800 border border-green-200',
    [UserRole.OPERATOR]: 'bg-slate-100 text-slate-700 border border-slate-200',
};

const ROLE_AVATAR_COLORS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'bg-gradient-to-br from-purple-600 to-violet-700',
    [UserRole.ADMIN]: 'bg-gradient-to-br from-red-600 to-rose-700',
    [UserRole.PROCUREMENT_MANAGER]: 'bg-gradient-to-br from-blue-500 to-blue-700',
    [UserRole.QUALITY_MANAGER]: 'bg-gradient-to-br from-teal-500 to-teal-700',
    [UserRole.WAREHOUSE_MANAGER]: 'bg-gradient-to-br from-amber-500 to-amber-700',
    [UserRole.PRODUCTION_MANAGER]: 'bg-gradient-to-br from-orange-500 to-orange-700',
    [UserRole.SALES_MANAGER]: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    [UserRole.FINANCE_MANAGER]: 'bg-gradient-to-br from-cyan-600 to-cyan-800',
    [UserRole.COMPLIANCE_OFFICER]: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    [UserRole.ACCOUNTANT]: 'bg-gradient-to-br from-green-500 to-green-700',
    [UserRole.OPERATOR]: 'bg-gradient-to-br from-slate-500 to-slate-700',
};

// ─── Component ───────────────────────────────────────────
export const UserManagement: React.FC<UserManagementProps> = ({
    currentUserRole,
    currentUserName
}) => {
    // State
    const [users, setUsers] = useState<UserData[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, disabled: 0, byRole: {} });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [resetTarget, setResetTarget] = useState<UserData | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: UserRole.OPERATOR as UserRole,
        department: '',
        locationId: '',
        password: ''
    });

    const canManageUsers = hasPermission(currentUserRole, 'manage_users');

    // ─── Data Loading ────────────────────────────────────
    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const [usersData, locationsData] = await Promise.all([
                api.users.getAll(),
                api.locations.getAll()
            ]);
            setUsers(usersData);
            setLocations(locationsData.filter((l: Location) => l.isActive));
            const userStats = await api.users.getStats(usersData);
            setStats(userStats);
        } catch (error) {
            console.error('Error loading data:', error);
            showMessage('error', 'Failed to load data');
        }
        setIsLoading(false);
    };

    // ─── Filtering & Pagination ──────────────────────────
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (user.department || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'active' && user.isActive) ||
                (statusFilter === 'disabled' && !user.isActive);
            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [users, searchQuery, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * USERS_PER_PAGE,
        currentPage * USERS_PER_PAGE
    );

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [searchQuery, roleFilter, statusFilter]);

    // ─── Helpers ─────────────────────────────────────────
    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const getAssignableRoles = (): UserRole[] => {
        return Object.values(UserRole).filter(role => canManageRole(currentUserRole, role));
    };

    const getInitials = (name: string) =>
        name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        return new Date(dateStr).toLocaleString('en-NG', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getLocationName = (locId: string) =>
        locations.find(l => l.id === locId)?.name || locId || '—';

    // ─── Actions ─────────────────────────────────────────
    const handleOpenModal = (user?: UserData) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                email: user.email,
                name: user.name,
                role: user.role,
                department: user.department || '',
                locationId: user.locationId,
                password: ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                email: '',
                name: '',
                role: UserRole.OPERATOR,
                department: '',
                locationId: locations.length > 0 ? locations[0].id : '',
                password: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canManageRole(currentUserRole, formData.role) && formData.role !== currentUserRole) {
            showMessage('error', 'You cannot assign a role equal to or higher than your own');
            return;
        }

        try {
            if (editingUser) {
                const updated = await api.users.update(editingUser.id, {
                    name: formData.name,
                    role: formData.role,
                    department: formData.department,
                    locationId: formData.locationId
                });
                if (updated) {
                    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
                    showMessage('success', 'User updated successfully');
                    api.audit.log('USER_UPDATE', `Updated user: ${editingUser.name} (${editingUser.role})`, currentUserName, currentUserRole);
                }
            } else {
                const created = await api.users.create({
                    email: formData.email,
                    name: formData.name,
                    role: formData.role,
                    department: formData.department,
                    location_id: formData.locationId,
                    password: formData.password,
                    is_active: true
                });
                if (created) {
                    await loadUsers();
                    showMessage('success', 'User created successfully');
                    api.audit.log('USER_CREATE', `Created new user: ${formData.name} (${formData.role})`, currentUserName, currentUserRole);
                }
            }
            handleCloseModal();
        } catch (error) {
            showMessage('error', editingUser ? 'Failed to update user' : 'Failed to create user');
        }
    };

    const handleToggleStatus = async (user: UserData) => {
        if (!canManageRole(currentUserRole, user.role)) {
            showMessage('error', 'You cannot modify a user with equal or higher privileges');
            return;
        }
        const updated = await api.users.toggleStatus(user.id, !user.isActive);
        if (updated) {
            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !user.isActive } : u));
            showMessage('success', `User ${user.isActive ? 'disabled' : 'enabled'} successfully`);
            api.audit.log('USER_STATUS_CHANGE', `${user.isActive ? 'Disabled' : 'Enabled'} user: ${user.name}`, currentUserName, currentUserRole);
        }
    };

    const handleDelete = async (user: UserData) => {
        if (!canManageRole(currentUserRole, user.role)) {
            showMessage('error', 'You cannot delete a user with equal or higher privileges');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) return;

        const success = await api.users.delete(user.id);
        if (success) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
            if (selectedUser?.id === user.id) setSelectedUser(null);
            showMessage('success', 'User deleted successfully');
            api.audit.log('USER_DELETE', `Deleted user: ${user.name}`, currentUserName, currentUserRole);
        } else {
            showMessage('error', 'Failed to delete user');
        }
    };

    const handleResetPassword = async () => {
        if (!resetTarget || !newPassword || newPassword.length < 6) {
            showMessage('error', 'Password must be at least 6 characters');
            return;
        }
        if (!resetTarget.authId) {
            showMessage('error', 'Cannot reset password — user has no auth account linked');
            return;
        }
        const success = await api.users.resetPassword(resetTarget.authId, newPassword);
        if (success) {
            showMessage('success', `Password reset for ${resetTarget.name}`);
            api.audit.log('PASSWORD_RESET', `Admin reset password for: ${resetTarget.name}`, currentUserName, currentUserRole);
        } else {
            showMessage('error', 'Password reset failed. Admin privileges may be required.');
        }
        setShowResetPassword(false);
        setNewPassword('');
        setResetTarget(null);
    };

    const openResetPassword = (user: UserData) => {
        setResetTarget(user);
        setNewPassword('');
        setShowResetPassword(true);
    };

    const handleExportCSV = () => {
        const header = 'Name,Email,Role,Department,Location,Status,Last Login,Created\n';
        const rows = filteredUsers.map(u =>
            `"${u.name}","${u.email}","${u.role}","${u.department || ''}","${getLocationName(u.locationId)}","${u.isActive ? 'Active' : 'Disabled'}","${formatDateTime(u.lastLogin)}","${formatDate(u.createdAt)}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showMessage('success', `Exported ${filteredUsers.length} users to CSV`);
    };

    // ─── Access Denied ───────────────────────────────────
    if (!canManageUsers) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-slate-500 mt-2">You don't have permission to manage users.</p>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-8 h-8 text-indigo-600" />
                        User Management
                    </h2>
                    <p className="text-slate-500 mt-1">Manage system users, roles, and permissions</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExportCSV}
                        className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                    >
                        <UserPlus className="w-5 h-5" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                        <p className="text-sm text-slate-500">Total Users</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                        <UserCheck className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                        <p className="text-sm text-slate-500">Active Users</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <UserX className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{stats.disabled}</p>
                        <p className="text-sm text-slate-500">Disabled Users</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{Object.keys(stats.byRole).length}</p>
                        <p className="text-sm text-slate-500">Active Roles</p>
                    </div>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 animate-in slide-in-from-top ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, email, or department…"
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[180px]"
                >
                    <option value="all">All Roles</option>
                    {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'disabled')}
                    className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[140px]"
                >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                </select>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-6">
                {/* Users Table */}
                <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all ${selectedUser ? 'flex-1' : 'w-full'}`}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        </div>
                    ) : paginatedUsers.length === 0 ? (
                        <div className="text-center py-20">
                            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-slate-700">No Users Found</h3>
                            <p className="text-slate-500 mt-2">
                                {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                                    ? 'Try adjusting your filters'
                                    : 'Add your first user to get started'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                                            <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                                            <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="hidden xl:table-cell px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Login</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100">
                                        {paginatedUsers.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={`hover:bg-indigo-50/40 transition-colors cursor-pointer ${selectedUser?.id === user.id ? 'bg-indigo-50' : ''}`}
                                                onClick={() => setSelectedUser(user)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full ${ROLE_AVATAR_COLORS[user.role]} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                                                            {getInitials(user.name)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                                                            <p className="text-xs text-slate-500">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="hidden lg:table-cell px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {user.department || '—'}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    {getLocationName(user.locationId)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user.isActive
                                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                                        {user.isActive ? 'Active' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="hidden xl:table-cell px-4 py-4 whitespace-nowrap text-xs text-slate-500">
                                                    {formatDateTime(user.lastLogin)}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {canManageRole(currentUserRole, user.role) && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleToggleStatus(user)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title={user.isActive ? 'Disable User' : 'Enable User'}
                                                                >
                                                                    {user.isActive
                                                                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                                                                        : <ToggleLeft className="w-5 h-5" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenModal(user)}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title="Edit User"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => openResetPassword(user)}
                                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                                    title="Reset Password"
                                                                >
                                                                    <Key className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(user)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete User"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                                    <p className="text-sm text-slate-500">
                                        Showing {((currentPage - 1) * USERS_PER_PAGE) + 1}–{Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let page: number;
                                            if (totalPages <= 5) {
                                                page = i + 1;
                                            } else if (currentPage <= 3) {
                                                page = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                page = totalPages - 4 + i;
                                            } else {
                                                page = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                                        ? 'bg-indigo-600 text-white shadow-sm'
                                                        : 'border border-slate-300 text-slate-600 hover:bg-white'
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                        <button
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="p-2 rounded-lg border border-slate-300 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition-colors"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* User Detail Panel */}
                {selectedUser && (
                    <div className="hidden lg:block w-96 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white relative">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className={`w-16 h-16 rounded-2xl ${ROLE_AVATAR_COLORS[selectedUser.role]} flex items-center justify-center text-white font-bold text-xl shadow-lg mb-4`}>
                                {getInitials(selectedUser.name)}
                            </div>
                            <h3 className="text-lg font-bold">{selectedUser.name}</h3>
                            <p className="text-indigo-200 text-sm">{selectedUser.email}</p>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold mt-3 ${ROLE_COLORS[selectedUser.role]}`}>
                                {selectedUser.role}
                            </span>
                        </div>

                        <div className="p-5 space-y-5 max-h-[calc(100vh-400px)] overflow-y-auto">
                            {/* Info Grid */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Building className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Department:</span>
                                    <span className="font-medium text-slate-800 ml-auto">{selectedUser.department || '—'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Eye className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Location:</span>
                                    <span className="font-medium text-slate-800 ml-auto">{getLocationName(selectedUser.locationId)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Activity className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Status:</span>
                                    <span className={`ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${selectedUser.isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${selectedUser.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                        {selectedUser.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Last Login:</span>
                                    <span className="font-medium text-slate-800 ml-auto text-xs">{formatDateTime(selectedUser.lastLogin)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span className="text-slate-500">Created:</span>
                                    <span className="font-medium text-slate-800 ml-auto text-xs">{formatDate(selectedUser.createdAt)}</span>
                                </div>
                            </div>

                            {/* Permissions */}
                            <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Permissions</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {(ROLE_PERMISSIONS[selectedUser.role] || []).map((perm: Permission) => (
                                        <span
                                            key={perm}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200"
                                        >
                                            {perm.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            {canManageRole(currentUserRole, selectedUser.role) && (
                                <div className="pt-3 border-t border-slate-200 space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h4>
                                    <button
                                        onClick={() => handleOpenModal(selectedUser)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                    >
                                        <Edit2 className="w-4 h-4" /> Edit User
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(selectedUser)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                    >
                                        {selectedUser.isActive
                                            ? <><ToggleLeft className="w-4 h-4" /> Disable User</>
                                            : <><ToggleRight className="w-4 h-4" /> Enable User</>}
                                    </button>
                                    <button
                                        onClick={() => openResetPassword(selectedUser)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                    >
                                        <Key className="w-4 h-4" /> Reset Password
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedUser)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete User
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Add/Edit Modal ─────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold">
                                        {editingUser ? 'Edit User' : 'Add New User'}
                                    </h3>
                                    <p className="text-indigo-200 text-sm mt-1">
                                        {editingUser ? 'Update user details and role' : 'Create a new system user'}
                                    </p>
                                </div>
                                <button onClick={handleCloseModal} className="text-white/70 hover:text-white transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        placeholder="user@company.com"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        minLength={6}
                                        placeholder="Minimum 6 characters"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {getAssignableRoles().map(role => (
                                            <option key={role} value={role}>{role}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        placeholder="e.g. Operations"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                                <select
                                    value={formData.locationId}
                                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                    required
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select Location</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-sm transition-all hover:shadow-md"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Reset Password Modal ──────────────────── */}
            {showResetPassword && resetTarget && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => { setShowResetPassword(false); setResetTarget(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-5 text-white">
                            <div className="flex items-center gap-3">
                                <Key className="w-6 h-6" />
                                <div>
                                    <h3 className="text-lg font-bold">Reset Password</h3>
                                    <p className="text-amber-100 text-sm">{resetTarget.name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                    required
                                    placeholder="Minimum 6 characters"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowResetPassword(false); setResetTarget(null); }}
                                    className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium shadow-sm transition-all"
                                >
                                    Reset Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
