import { useState, useEffect, useCallback } from 'react';
import { 
    Printer, Settings as SettingsIcon, ShieldCheck, RefreshCw, 
    Database, Download, Upload, CheckCircle2, AlertTriangle, 
    Play, Lock, Phone, MapPin, Receipt, FileText, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

export default function AdminSettings() {
    const [activeTab, setActiveTab] = useState('printers'); // 'printers' | 'restaurant' | 'audit' | 'sync' | 'backup'
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Settings State (A18, A19)
    const [settings, setSettings] = useState({
        restaurantName: 'The Sparkling Garden Restaurant',
        tagline: 'Fine Dine & Outdoor Experience',
        address: 'Survey No. 42, Green Park Avenue, Near City Centre, Pune - 411001',
        phone: '+91 98765 43210',
        email: 'contact@sparklingrestaurant.com',
        gstNumber: '27AAAAA0000A1Z5',
        fssaiLicense: '11522000000001',
        cgstPercent: 2.5,
        sgstPercent: 2.5,
        serviceChargePercent: 0,
        managerPin: '9999',
        kitchenPrinter: {
            enabled: true,
            name: 'Kitchen Thermal Printer',
            type: 'network',
            ip: '192.168.1.200',
            port: 9100,
            paperWidth: '80mm',
            autoPrintOrders: true,
            autoPrintCancellations: true
        },
        billingPrinter: {
            enabled: true,
            name: 'Billing Desk Thermal Printer',
            type: 'network',
            ip: '192.168.1.201',
            port: 9100,
            paperWidth: '80mm',
            autoPrintInvoice: true
        }
    });

    // Audit Logs State (A20)
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilter, setAuditFilter] = useState('all');

    // Sync State (A21)
    const [syncStatus, setSyncStatus] = useState({
        isOnline: true,
        pendingPrintJobsCount: 0,
        failedPrintJobsCount: 0,
        recentPendingJobs: [],
        lastSyncedAt: new Date(),
        serverTime: new Date()
    });

    // Backup & Recovery State (A22)
    const [isExporting, setIsExporting] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreFileJson, setRestoreFileJson] = useState(null);

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const [setRes, syncRes, auditRes] = await Promise.all([
                api.get('/admin/settings').catch(() => ({ data: {} })),
                api.get('/admin/sync-status').catch(() => ({ data: {} })),
                api.get('/admin/audit-logs').catch(() => ({ data: [] }))
            ]);

            if (setRes.data && setRes.data.restaurantName) {
                setSettings(setRes.data);
            }
            setSyncStatus(syncRes.data || {});
            setAuditLogs(auditRes.data || []);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load settings:', err);
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Save Settings (A18, A19)
    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put('/admin/settings', settings);
            toast.success('Configuration saved successfully');
            setIsSaving(false);
        } catch (err) {
            console.error('Failed to save settings:', err);
            toast.error(err.response?.data?.message || 'Failed to save settings');
            setIsSaving(false);
        }
    };

    // Test Print Job (A18)
    const handleTestPrint = async (target) => {
        try {
            const res = await api.post('/admin/printer/test', { target });
            toast.success(res.data.message || `Test print sent to ${target} printer`);
            loadSettings();
        } catch (err) {
            toast.error('Failed to send test print');
        }
    };

    // Download Backup (A22)
    const handleDownloadBackup = async () => {
        setIsExporting(true);
        try {
            const res = await api.get('/admin/backup', { responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sparkling-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Database backup downloaded successfully');
        } catch (err) {
            toast.error('Failed to export database backup');
        } finally {
            setIsExporting(false);
        }
    };

    // File Selected for Restore (A22)
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                setRestoreFileJson(parsed);
                toast.success(`Backup file loaded: ${parsed.counts?.menuItems || 0} menu items`);
            } catch (err) {
                toast.error('Invalid JSON backup file');
                setRestoreFileJson(null);
            }
        };
        reader.readAsText(file);
    };

    // Execute Restore (A22)
    const handleExecuteRestore = async () => {
        if (!restoreFileJson) return;
        if (!window.confirm('Are you sure you want to restore? This will synchronize items from the backup.')) return;

        setIsRestoring(true);
        try {
            const res = await api.post('/admin/restore', { backup: restoreFileJson });
            toast.success(res.data.message || 'Backup restored successfully');
            setRestoreFileJson(null);
            loadSettings();
        } catch (err) {
            toast.error('Failed to restore backup');
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="text-[#222222] max-w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">System &amp; Hardware Settings</h1>
                    <p className="text-[#818181] text-xs mt-1">
                        Configure thermal printers, restaurant business info, audit trails, and data backups
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-3 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('printers')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === 'printers' ? "bg-[#5A724A] text-white shadow-xs" : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <Printer size={14} />
                    Printer Hardware (A18)
                </button>
                <button
                    onClick={() => setActiveTab('restaurant')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === 'restaurant' ? "bg-[#5A724A] text-white shadow-xs" : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <SettingsIcon size={14} />
                    Restaurant Config (A19)
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === 'audit' ? "bg-[#5A724A] text-white shadow-xs" : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <ShieldCheck size={14} />
                    Audit Logs (A20)
                </button>
                <button
                    onClick={() => setActiveTab('sync')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === 'sync' ? "bg-[#5A724A] text-white shadow-xs" : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <RefreshCw size={14} />
                    Offline Sync (A21)
                </button>
                <button
                    onClick={() => setActiveTab('backup')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                        activeTab === 'backup' ? "bg-[#5A724A] text-white shadow-xs" : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <Database size={14} />
                    Backup &amp; Recovery (A22)
                </button>
            </div>

            {/* TAB 1: PRINTER HARDWARE SETTINGS (A18) */}
            {activeTab === 'printers' && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Kitchen Thermal Ticket Station */}
                        <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[#5A724A]/10 text-[#5A724A] flex items-center justify-center">
                                        <Printer size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-sm text-[#222222]">Kitchen Thermal Ticket Station</h3>
                                        <p className="text-[10px] text-[#818181]">Chef ticket printer (No kitchen screen required)</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTestPrint('kitchen')}
                                    className="px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] text-xs font-bold text-[#5A724A] hover:bg-[#BCE2A3]/30 flex items-center gap-1 shadow-xs"
                                >
                                    <Play size={11} /> Test Print
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Printer Device Name</label>
                                    <input
                                        type="text"
                                        value={settings.kitchenPrinter?.name || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            kitchenPrinter: { ...settings.kitchenPrinter, name: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Printer IP Address</label>
                                        <input
                                            type="text"
                                            value={settings.kitchenPrinter?.ip || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                kitchenPrinter: { ...settings.kitchenPrinter, ip: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Paper Width</label>
                                        <select
                                            value={settings.kitchenPrinter?.paperWidth || '80mm'}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                kitchenPrinter: { ...settings.kitchenPrinter, paperWidth: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                        >
                                            <option value="80mm">80mm (Standard Kitchen)</option>
                                            <option value="58mm">58mm (Compact)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-[#F4F6F0]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.kitchenPrinter?.autoPrintOrders ?? true}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                kitchenPrinter: { ...settings.kitchenPrinter, autoPrintOrders: e.target.checked }
                                            })}
                                            className="rounded text-[#5A724A] focus:ring-0"
                                        />
                                        <span className="text-xs font-bold text-[#222222]">Auto-print ticket when guest or waiter submits order</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.kitchenPrinter?.autoPrintCancellations ?? true}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                kitchenPrinter: { ...settings.kitchenPrinter, autoPrintCancellations: e.target.checked }
                                            })}
                                            className="rounded text-[#5A724A] focus:ring-0"
                                        />
                                        <span className="text-xs font-bold text-[#222222]">Auto-print cancellation notice with &ldquo;*** CANCELLED ORDER ***&rdquo;</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Billing Desk Thermal Printer */}
                        <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[#5A724A]/10 text-[#5A724A] flex items-center justify-center">
                                        <Receipt size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-sm text-[#222222]">Billing Counter Receipt Printer</h3>
                                        <p className="text-[10px] text-[#818181]">Guest bill receipt and payment invoice</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleTestPrint('billing')}
                                    className="px-3 py-1.5 rounded-full bg-[#FAF8F5] border border-[#E5E0D8] text-xs font-bold text-[#5A724A] hover:bg-[#BCE2A3]/30 flex items-center gap-1 shadow-xs"
                                >
                                    <Play size={11} /> Test Print
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Printer Device Name</label>
                                    <input
                                        type="text"
                                        value={settings.billingPrinter?.name || ''}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            billingPrinter: { ...settings.billingPrinter, name: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Printer IP Address</label>
                                        <input
                                            type="text"
                                            value={settings.billingPrinter?.ip || ''}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                billingPrinter: { ...settings.billingPrinter, ip: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Paper Width</label>
                                        <select
                                            value={settings.billingPrinter?.paperWidth || '80mm'}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                billingPrinter: { ...settings.billingPrinter, paperWidth: e.target.value }
                                            })}
                                            className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                        >
                                            <option value="80mm">80mm (Standard)</option>
                                            <option value="58mm">58mm (Narrow)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-[#F4F6F0]">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.billingPrinter?.autoPrintInvoice ?? true}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                billingPrinter: { ...settings.billingPrinter, autoPrintInvoice: e.target.checked }
                                            })}
                                            className="rounded text-[#5A724A] focus:ring-0"
                                        />
                                        <span className="text-xs font-bold text-[#222222]">Auto-print tax invoice when cashier confirms payment</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white shadow-xs disabled:opacity-50"
                        >
                            {isSaving ? 'Saving Configurations...' : 'Save Hardware Configurations'}
                        </button>
                    </div>
                </form>
            )}

            {/* TAB 2: RESTAURANT & TAX CONFIGURATION (A19) */}
            {activeTab === 'restaurant' && (
                <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-5 max-w-2xl">
                    <div>
                        <h3 className="font-extrabold text-sm text-[#222222]">Restaurant Profile &amp; Legal Tax Details</h3>
                        <p className="text-[10px] text-[#818181]">These details appear on printed bills and digital guest invoices</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Restaurant Name</label>
                            <input
                                type="text"
                                value={settings.restaurantName}
                                onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Address</label>
                            <input
                                type="text"
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Phone</label>
                            <input
                                type="text"
                                value={settings.phone}
                                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">GSTIN Number</label>
                            <input
                                type="text"
                                value={settings.gstNumber}
                                onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                                className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">CGST (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.cgstPercent}
                                onChange={(e) => setSettings({ ...settings, cgstPercent: Number(e.target.value) })}
                                className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">SGST (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={settings.sgstPercent}
                                onChange={(e) => setSettings({ ...settings, sgstPercent: Number(e.target.value) })}
                                className="w-full px-3 py-2 text-xs font-mono border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <div className="col-span-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                            <label className="text-[10px] font-bold text-amber-900 uppercase block mb-1">
                                POS Manager Override PIN (For Discounts &gt;10% or &gt;₹100)
                            </label>
                            <input
                                type="password"
                                value={settings.managerPin}
                                onChange={(e) => setSettings({ ...settings, managerPin: e.target.value })}
                                placeholder="Default: 9999"
                                className="w-full px-3 py-2 text-xs font-mono font-bold border border-amber-300 rounded-xl bg-white outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-6 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white shadow-xs disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Restaurant Info'}
                        </button>
                    </div>
                </form>
            )}

            {/* TAB 3: AUDIT LOGS (A20) */}
            {activeTab === 'audit' && (
                <div className="bg-white rounded-3xl border border-[#EBEBEB] overflow-hidden shadow-xs">
                    <div className="p-4 border-b border-[#F4F6F0] flex items-center justify-between">
                        <div>
                            <h3 className="font-extrabold text-sm text-[#222222]">Staff Activity Audit Log</h3>
                            <p className="text-[10px] text-[#818181]">Immutable audit trail recording financial voids, discounts, edits &amp; table releases</p>
                        </div>
                        <button
                            onClick={loadSettings}
                            className="p-1.5 rounded-xl border border-[#EBEBEB] hover:text-[#5A724A]"
                            title="Refresh logs"
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[10px] uppercase font-bold text-[#818181]">
                                <tr>
                                    <th className="py-3 px-4">Timestamp</th>
                                    <th className="py-3 px-4">Staff Member</th>
                                    <th className="py-3 px-4">Role</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4">Entity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F6F0]">
                                {auditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="py-8 text-center text-[#818181]">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                ) : (
                                    auditLogs.map((log, i) => (
                                        <tr key={log._id || i} className="hover:bg-[#FAF8F5]">
                                            <td className="py-3 px-4 font-mono text-[#818181]">
                                                {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[#222222]">{log.userName || 'System / Staff'}</td>
                                            <td className="py-3 px-4 uppercase text-[10px] font-bold text-[#5A724A]">{log.role || 'Staff'}</td>
                                            <td className="py-3 px-4 font-medium text-[#222222]">{log.action}</td>
                                            <td className="py-3 px-4 text-[#818181]">{log.entityType || 'Record'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: OFFLINE SYNCHRONIZATION (A21) */}
            {activeTab === 'sync' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 bg-white rounded-3xl border border-[#EBEBEB] shadow-xs">
                            <span className="text-[10px] font-bold uppercase text-[#818181] block">Server Connection</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-base font-extrabold text-[#222222]">Online &amp; Connected</span>
                            </div>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-[#EBEBEB] shadow-xs">
                            <span className="text-[10px] font-bold uppercase text-[#818181] block">Pending Print Jobs</span>
                            <span className="text-2xl font-mono font-black text-[#5A724A] mt-1 block">
                                {syncStatus.pendingPrintJobsCount || 0}
                            </span>
                        </div>

                        <div className="p-5 bg-white rounded-3xl border border-[#EBEBEB] shadow-xs">
                            <span className="text-[10px] font-bold uppercase text-[#818181] block">Failed Print Jobs</span>
                            <span className="text-2xl font-mono font-black text-amber-600 mt-1 block">
                                {syncStatus.failedPrintJobsCount || 0}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-3">
                        <h4 className="font-extrabold text-sm text-[#222222]">Real-time Network Sync Status</h4>
                        <p className="text-xs text-[#818181] leading-relaxed">
                            The POS and Waiter systems continuously persist orders and pending tickets to both the local cache and the central database. If the network is interrupted, operations continue offline and automatically synchronize upon reconnection.
                        </p>
                        <div className="pt-2">
                            <button
                                onClick={loadSettings}
                                className="px-4 py-2 rounded-full bg-[#5A724A] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                                <RefreshCw size={12} /> Force Sync Check Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 5: BACKUP & RECOVERY (A22) */}
            {activeTab === 'backup' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Export */}
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-4">
                        <div className="w-10 h-10 rounded-2xl bg-[#5A724A]/10 text-[#5A724A] flex items-center justify-center">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm text-[#222222]">Export Full Database Backup</h3>
                            <p className="text-xs text-[#818181] mt-1">
                                Downloads a structured JSON snapshot of all menu items, categories, active and past orders, 32 tables, staff accounts, and restaurant settings.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadBackup}
                            disabled={isExporting}
                            className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white flex items-center gap-2 shadow-xs disabled:opacity-50"
                        >
                            <Download size={14} />
                            {isExporting ? 'Generating Backup...' : 'Download JSON Backup'}
                        </button>
                    </div>

                    {/* Restore */}
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] p-6 shadow-xs space-y-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-sm text-[#222222]">Restore Database from Backup</h3>
                            <p className="text-xs text-[#818181] mt-1">
                                Select a previously exported `.json` file to restore or synchronize menu recipes, pricing, and system configurations.
                            </p>
                        </div>

                        <div>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-[#818181] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#FAF8F5] file:text-[#5A724A] hover:file:bg-[#BCE2A3]/30"
                            />
                        </div>

                        {restoreFileJson && (
                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-300 text-xs text-emerald-900 space-y-1">
                                <p className="font-bold">Backup file valid &amp; ready to restore:</p>
                                <p className="text-[11px]">
                                    Contains {restoreFileJson.counts?.menuItems || 0} menu items, {restoreFileJson.counts?.tables || 0} tables.
                                </p>
                                <button
                                    onClick={handleExecuteRestore}
                                    disabled={isRestoring}
                                    className="mt-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold"
                                >
                                    {isRestoring ? 'Restoring...' : 'Confirm & Restore Now'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

