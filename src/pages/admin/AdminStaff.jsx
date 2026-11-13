import { useState, useEffect, useCallback } from 'react';
import { 
    Users, Plus, Edit2, Trash2, ShieldCheck, UserCheck, 
    UserX, Key, Mail, Phone, Lock, CheckCircle2, XCircle, 
    Search, AlertCircle, X, Shield, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const AVAILABLE_PERMISSIONS = [
    { key: 'settle_bills', label: 'Settle Bills (Cashier)', desc: 'Mark guest bills as paid and release tables' },
    { key: 'apply_discounts', label: 'Apply Authorized Discounts', desc: 'Apply flat or percentage discounts on table tabs' },
    { key: 'edit_menu', label: 'Menu & Category CRUD', desc: 'Create, update, and toggle dishes and prices' },
    { key: 'create_orders', label: 'Place Orders (Waiter)', desc: 'Submit table orders to kitchen' },
    { key: 'view_reports', label: 'View Financial & Sales Reports', desc: 'Inspect daily revenue, 4-month history & analytics' },
    { key: 'manage_staff', label: 'Manage Employees & Roles', desc: 'Add staff, assign roles, and alter permissions' },
    { key: 'manage_tables', label: 'Table Management & QR', desc: 'Configure tables and download QR codes' },
    { key: 'manage_settings', label: 'System & Printer Settings', desc: 'Edit restaurant tax details and thermal printer configs' },
];

const DEFAULT_ROLE_PERMISSIONS = {
    admin: AVAILABLE_PERMISSIONS.map(p => p.key),
    billing: ['settle_bills', 'apply_discounts', 'view_reports', 'manage_tables'],
    waiter: ['create_orders', 'manage_tables'],
    kitchen: ['create_orders']
};

export default function AdminStaff() {
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    // Add / Edit Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'waiter',
        permissions: DEFAULT_ROLE_PERMISSIONS.waiter,
        isActive: true
    });

    const loadEmployees = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/admin/employees');
            setEmployees(res.data || []);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load employees:', err);
            toast.error('Failed to fetch staff directory');
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    const handleOpenAdd = () => {
        setEditingEmployee(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            role: 'waiter',
            permissions: DEFAULT_ROLE_PERMISSIONS.waiter,
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (emp) => {
        setEditingEmployee(emp);
        setFormData({
            name: emp.name || '',
            email: emp.email || '',
            phone: emp.phone || '',
            password: '', // blank to keep unchanged
            role: emp.role || 'waiter',
            permissions: Array.isArray(emp.permissions) && emp.permissions.length > 0 
                ? emp.permissions 
                : (DEFAULT_ROLE_PERMISSIONS[emp.role] || []),
            isActive: emp.isActive !== false
        });
        setIsModalOpen(true);
    };

    const handleRoleChange = (newRole) => {
        setFormData(prev => ({
            ...prev,
            role: newRole,
            permissions: DEFAULT_ROLE_PERMISSIONS[newRole] || []
        }));
    };

    const handleTogglePermission = (permKey) => {
        setFormData(prev => {
            const current = prev.permissions || [];
            if (current.includes(permKey)) {
                return { ...prev, permissions: current.filter(p => p !== permKey) };
            } else {
                return { ...prev, permissions: [...current, permKey] };
            }
        });
    };

    const handleSaveEmployee = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('Name and email are required');
            return;
        }

        if (!editingEmployee && (!formData.password || formData.password.length < 6)) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsSaving(true);
        try {
            if (editingEmployee) {
                await api.put(`/admin/employees/${editingEmployee._id}`, formData);
                toast.success(`Updated ${formData.name}`);
            } else {
                await api.post('/admin/employees', formData);
                toast.success(`Staff member ${formData.name} created`);
            }
            setIsModalOpen(false);
            loadEmployees();
        } catch (err) {
            console.error('Failed to save staff member:', err);
            toast.error(err.response?.data?.message || 'Failed to save employee');
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleStatus = async (emp) => {
        try {
            const res = await api.patch(`/admin/employees/${emp._id}/toggle-status`);
            toast.success(res.data.message || 'Status updated');
            loadEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
    };

    const handleDeleteEmployee = async (emp) => {
        if (!window.confirm(`Are you sure you want to remove ${emp.name}?`)) return;
        try {
            await api.delete(`/admin/employees/${emp._id}`);
            toast.success(`Employee ${emp.name} removed`);
            loadEmployees();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete employee');
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
        const matchesSearch = !searchQuery.trim() || 
            emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (emp.phone && emp.phone.includes(searchQuery));
        return matchesRole && matchesSearch;
    });

    return (
        <div className="text-[#222222] max-w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">Staff &amp; Role Access</h1>
                    <p className="text-[#818181] text-xs mt-1">
                        Employee accounts, credential access, role-based capabilities, and activation status
                    </p>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs self-start"
                >
                    <Plus size={16} />
                    Add Staff Member
                </button>
            </div>

            {/* Role Filter & Search */}
            <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#818181]" size={16} />
                    <input
                        type="text"
                        placeholder="Search employees by name, email or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-[#EBEBEB] rounded-full bg-[#F8F8F8] focus:bg-white focus:border-[#5A724A] outline-none"
                    />
                </div>

                <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-full border border-[#EBEBEB]">
                    {['all', 'admin', 'billing', 'waiter'].map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={clsx(
                                "px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                                roleFilter === role ? "bg-white text-[#222222] shadow-xs" : "text-[#818181] hover:text-[#222222]"
                            )}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {/* Employees Grid */}
            {isLoading ? (
                <div className="p-16 text-center text-[#818181] bg-white rounded-3xl border border-[#EBEBEB]">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-[#5A724A]" size={28} />
                    <p className="text-xs font-semibold">Loading staff directory...</p>
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="p-16 text-center text-[#818181] bg-white rounded-3xl border border-[#EBEBEB]">
                    <AlertCircle className="mx-auto mb-2 text-amber-600" size={32} />
                    <p className="text-sm font-bold text-[#222222]">No employees found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEmployees.map((emp) => (
                        <motion.div
                            key={emp._id}
                            layout
                            className={clsx(
                                "bg-white rounded-3xl border p-5 transition-all shadow-xs flex flex-col justify-between space-y-4",
                                emp.isActive !== false ? "border-[#EBEBEB] hover:border-[#5A724A]" : "border-red-200 bg-red-50/15"
                            )}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm",
                                            emp.role === 'admin' ? "bg-purple-100 text-purple-700" :
                                            emp.role === 'billing' ? "bg-emerald-100 text-emerald-700" :
                                            emp.role === 'waiter' ? "bg-blue-100 text-blue-700" :
                                            "bg-amber-100 text-amber-700"
                                        )}>
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-sm text-[#222222]">{emp.name}</h3>
                                            <span className={clsx(
                                                "inline-block uppercase font-bold text-[9px] px-2 py-0.5 rounded-full mt-0.5",
                                                emp.role === 'admin' ? "bg-purple-100 text-purple-800" :
                                                emp.role === 'billing' ? "bg-emerald-100 text-emerald-800" :
                                                emp.role === 'waiter' ? "bg-blue-100 text-blue-800" :
                                                "bg-amber-100 text-amber-800"
                                            )}>
                                                {emp.role}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Active / Inactive Badge */}
                                    <button
                                        onClick={() => handleToggleStatus(emp)}
                                        className={clsx(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all",
                                            emp.isActive !== false
                                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                                : "bg-red-100 text-red-800 hover:bg-red-200"
                                        )}
                                        title="Click to toggle status"
                                    >
                                        {emp.isActive !== false ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                        {emp.isActive !== false ? 'Active' : 'Deactivated'}
                                    </button>
                                </div>

                                <div className="space-y-1.5 text-xs text-[#818181] pt-1 border-t border-[#F4F6F0]">
                                    <div className="flex items-center gap-2">
                                        <Mail size={12} className="text-[#818181]" />
                                        <span className="font-mono truncate">{emp.email}</span>
                                    </div>
                                    {emp.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone size={12} className="text-[#818181]" />
                                            <span className="font-mono">{emp.phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Permissions count */}
                                <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-[#818181] border-t border-[#F4F6F0]">
                                    <span className="flex items-center gap-1">
                                        <ShieldCheck size={13} className="text-[#5A724A]" />
                                        Permissions:
                                    </span>
                                    <span className="font-bold text-[#222222]">
                                        {emp.permissions?.length || 0} active
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F4F6F0]">
                                <button
                                    onClick={() => handleOpenEdit(emp)}
                                    className="px-3 py-1.5 rounded-xl border border-[#EBEBEB] bg-white text-xs font-bold text-[#818181] hover:text-[#5A724A] hover:border-[#5A724A] flex items-center gap-1 shadow-xs"
                                >
                                    <Edit2 size={12} /> Edit Account
                                </button>
                                <button
                                    onClick={() => handleDeleteEmployee(emp)}
                                    className="p-1.5 rounded-xl border border-[#EBEBEB] bg-white text-[#818181] hover:text-red-600 hover:border-red-300 shadow-xs"
                                    title="Delete Staff"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* MODAL: ADD / EDIT EMPLOYEE & PERMISSIONS (A10, A11, A12) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleSaveEmployee}
                            className="bg-white rounded-3xl border border-[#EBEBEB] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-3">
                                <div>
                                    <h3 className="font-extrabold text-base text-[#222222]">
                                        {editingEmployee ? `Edit Staff: ${editingEmployee.name}` : 'Add New Staff Member'}
                                    </h3>
                                    <p className="text-[10px] text-[#818181]">Configure account credentials, assigned role, and permissions</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-1 rounded-full text-[#818181] hover:text-[#222222]"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Name & Phone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Rahul Sharma"
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Mobile Phone</label>
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="e.g. 9876543210"
                                        className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>
                            </div>

                            {/* Email & Password */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Login Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="staff@sparkling.com"
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">
                                        Password {editingEmployee && '(leave blank to keep)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder={editingEmployee ? '••••••••' : 'Min 6 characters'}
                                        required={!editingEmployee}
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>
                            </div>

                            {/* Role Selection (A11) */}
                            <div>
                                <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1.5">Assigned Staff Role (A11) *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['waiter', 'billing', 'admin'].map((role) => (
                                        <button
                                            type="button"
                                            key={role}
                                            onClick={() => handleRoleChange(role)}
                                            className={clsx(
                                                "p-2.5 rounded-2xl border text-center transition-all",
                                                formData.role === role 
                                                    ? "bg-[#5A724A] text-white border-[#5A724A] shadow-xs" 
                                                    : "bg-[#F8F8F8] text-[#818181] border-[#EBEBEB] hover:border-[#5A724A]"
                                            )}
                                        >
                                            <span className="block text-xs font-extrabold capitalize">{role}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Permission Management (A12) */}
                            <div>
                                <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1.5">
                                    Granular Permissions (A12)
                                </label>
                                <div className="space-y-1.5 bg-[#F8F8F8] p-3 rounded-2xl border border-[#EBEBEB] max-h-48 overflow-y-auto">
                                    {AVAILABLE_PERMISSIONS.map((perm) => {
                                        const isChecked = formData.permissions?.includes(perm.key);
                                        return (
                                            <label
                                                key={perm.key}
                                                className="flex items-start gap-2.5 p-1.5 hover:bg-white rounded-xl transition-all cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleTogglePermission(perm.key)}
                                                    className="mt-0.5 rounded text-[#5A724A] focus:ring-0"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-[#222222]">{perm.label}</p>
                                                    <p className="text-[10px] text-[#818181]">{perm.desc}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-[#818181] hover:text-[#222222]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Staff Account'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

