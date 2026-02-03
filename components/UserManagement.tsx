import React, { useState, useEffect } from 'react';
import { UserRole, hasPermission, canManageRole } from '../types';
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
    ToggleRight
} from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    location: string;
    isActive: boolean;
    createdAt: string;
}

interface UserManagementProps {
    currentUserRole: UserRole;
    currentUserName: string;
}

export const UserManagement: React.FC<UserManagementProps> = ({
    currentUserRole,
    currentUserName
}) => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: UserRole.CASHIER as UserRole,
        location: 'HQ - Abuja',
        password: ''
    });

    const canManageUsers = hasPermission(currentUserRole, 'manage_users');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const data = await api.users.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
            showMessage('error', 'Failed to load users');
        }
        setIsLoading(false);
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleOpenModal = (user?: UserData) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                email: user.email,
                name: user.name,
                role: user.role,
                location: user.location,
                password: ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                email: '',
                name: '',
                role: UserRole.CASHIER,
                location: 'HQ - Abuja',
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
                // Update existing user
                const updated = await api.users.update(editingUser.id, {
                    name: formData.name,
                    role: formData.role,
                    location: formData.location
                });
                if (updated) {
                    setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updated } : u));
                    showMessage('success', 'User updated successfully');
                }
            } else {
                // Create new user
                const created = await api.users.create({
                    email: formData.email,
                    name: formData.name,
                    role: formData.role,
                    location: formData.location,
                    password: formData.password
                });
                if (created) {
                    setUsers(prev => [...prev, created]);
                    showMessage('success', 'User created successfully');
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
        }
    };

    const handleDelete = async (user: UserData) => {
        if (!canManageRole(currentUserRole, user.role)) {
            showMessage('error', 'You cannot delete a user with equal or higher privileges');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
            return;
        }

        const success = await api.users.delete(user.id);
        if (success) {
            setUsers(prev => prev.filter(u => u.id !== user.id));
            showMessage('success', 'User deleted successfully');
        } else {
            showMessage('error', 'Failed to delete user');
        }
    };

    // Filter users based on search and role
    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Get available roles that the current user can assign
    const getAssignableRoles = (): UserRole[] => {
        const allRoles = Object.values(UserRole);
        return allRoles.filter(role => canManageRole(currentUserRole, role));
    };

    const getRoleColor = (role: UserRole): string => {
        switch (role) {
            case UserRole.SUPER_ADMIN:
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case UserRole.ADMIN:
                return 'bg-red-100 text-red-800 border-red-200';
            case UserRole.MANAGER:
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case UserRole.ACCOUNTANT:
                return 'bg-green-100 text-green-800 border-green-200';
            case UserRole.CASHIER:
                return 'bg-slate-100 text-slate-800 border-slate-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (!canManageUsers) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Access Denied</h2>
                <p className="text-slate-500 mt-2">You don't have permission to manage users.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-8 h-8 text-indigo-600" />
                        User Management
                    </h2>
                    <p className="text-slate-500 mt-1">Manage system users and their roles</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 text-white px-5 py-3 rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium shadow-sm transition-all hover:shadow-md"
                >
                    <UserPlus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-2 ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search users by name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="all">All Roles</option>
                    {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20">
                        <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-medium text-slate-700">No Users Found</h3>
                        <p className="text-slate-500 mt-2">
                            {searchQuery || roleFilter !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Add your first user to get started'}
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.location}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                            {user.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {canManageRole(currentUserRole, user.role) && (
                                                <>
                                                    <button
                                                        onClick={() => handleToggleStatus(user)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title={user.isActive ? 'Disable User' : 'Enable User'}
                                                    >
                                                        {user.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Edit User"
                                                    >
                                                        <Edit2 className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">
                                {editingUser ? 'Edit User' : 'Add New User'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {!editingUser && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        minLength={6}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    {getAssignableRoles().map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    {editingUser ? 'Update User' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
