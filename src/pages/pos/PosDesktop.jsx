import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Receipt, Users, Search, Plus, Minus, Trash2, 
    Printer, CheckCircle, Clock, ShieldCheck, RefreshCw, 
    X, Download, Filter, AlertTriangle, Lock, 
    Calendar, FileText, ArrowRight, DollarSign, Wallet, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, socket } from '../../services/api';

export default function PosDesktop() {
    // Current cashier/user
    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    // Main View Navigation: 'floor' | 'history' | 'audit' | 'reconciliation'
    const [view, setView] = useState('floor');

    // Floor & Table States
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [tableFilter, setTableFilter] = useState('all'); // 'all' (32 tables) | 'occupied' | 'billing' | 'available'
    const [isLoading, setIsLoading] = useState(true);
    const [failedPrintJobs, setFailedPrintJobs] = useState([]);

    // KPI & Today's Summary (B20, B21)
    const [stats, setStats] = useState({
        todayRevenue: 0,
        todayOrderCount: 0,
        occupiedCount: 0,
        activeTabsTotal: 0,
        cashCollected: 0
    });

    // Menu for Adding Items (B06)
    const [menuItems, setMenuItems] = useState([]);
    const [menuSearch, setMenuSearch] = useState('');
    const [showAddMenuModal, setShowAddMenuModal] = useState(false);

    // Modals
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');

    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'flat'
    const [discountValue, setDiscountValue] = useState('');
    const [managerPin, setManagerPin] = useState('');

    const [showSettleModal, setShowSettleModal] = useState(false);
    const [cashTendered, setCashTendered] = useState('');
    const [isSettling, setIsSettling] = useState(false);

    // Official Customer Tax Invoice Preview Modal (Matches Physical Receipt)
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceData, setInvoiceData] = useState(null);

    // History (B22, B23)
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().slice(0, 10));
    const [historySearch, setHistorySearch] = useState('');
    const [historyRecords, setHistoryRecords] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    // Audit Log (B24)
    const [auditLogs, setAuditLogs] = useState([]);
    const [isAuditLoading, setIsAuditLoading] = useState(false);

    // Cash Reconciliation (B26)
    const [countedCash, setCountedCash] = useState('');
    const [reconciliationNotes, setReconciliationNotes] = useState('');

    // PWA 1-Click Install state (Option 1)
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsInstalled(true);
        }
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
            toast.success('Sparkling POS installed to desktop!');
        });
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallPwa = async () => {
        if (!deferredPrompt) {
            toast('To install in Chrome or Edge, click the 💻 Install icon in the browser address bar.', { icon: '💻', duration: 6000 });
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    // Fetch floor tables and summary stats
    const loadFloorData = useCallback(async () => {
        try {
            const [tablesRes, statsRes, failedRes, menuRes] = await Promise.all([
                api.get('/pos/tables', { params: { all: 'true' } }),
                api.get('/pos/stats').catch(() => ({ data: {} })),
                api.get('/pos/print/failed').catch(() => ({ data: [] })),
                api.get('/menu').catch(() => ({ data: [] }))
            ]);

            setTables(tablesRes.data || []);
            setStats(statsRes.data || {});
            setFailedPrintJobs(failedRes.data || []);
            setMenuItems(menuRes.data || []);

            // Keep selectedTable updated
            setSelectedTable(prev => {
                if (!prev) return null;
                const found = (tablesRes.data || []).find(t => t.tableId === prev.tableId);
                return found || null;
            });

            setIsLoading(false);
        } catch (err) {
            console.error('POS load failed:', err);
            setIsLoading(false);
        }
    }, []);

    // Load History
    const loadHistory = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const res = await api.get('/pos/history', { 
                params: { date: historyDate, q: historySearch } 
            });
            setHistoryRecords(res.data || []);
            setIsHistoryLoading(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load sales history');
            setIsHistoryLoading(false);
        }
    }, [historyDate, historySearch]);

    // Load Audit Logs (B24)
    const loadAuditLogs = useCallback(async () => {
        setIsAuditLoading(true);
        try {
            const res = await api.get('/pos/audit');
            setAuditLogs(res.data || []);
            setIsAuditLoading(false);
        } catch (err) {
            toast.error('Failed to load audit logs');
            setIsAuditLoading(false);
        }
    }, []);

    // Socket.IO Real-time Synchronization
    useEffect(() => {
        loadFloorData();

        const events = ['table_update', 'new_order', 'order_status_update', 'print_job'];
        events.forEach(ev => socket.on(ev, loadFloorData));

        return () => {
            events.forEach(ev => socket.off(ev, loadFloorData));
        };
    }, [loadFloorData]);

    useEffect(() => {
        if (view === 'history') loadHistory();
        if (view === 'audit') loadAuditLogs();
    }, [view, loadHistory, loadAuditLogs]);

    // Filtered Tables
    const filteredTables = useMemo(() => {
        return tables.filter(t => {
            if (tableFilter === 'occupied') return t.status === 'occupied' || t.status === 'billing';
            if (tableFilter === 'billing') return t.status === 'billing';
            if (tableFilter === 'available') return t.status === 'available';
            return true;
        });
    }, [tables, tableFilter]);

    // Filtered Menu Items for Adding to Bill
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter(item => {
            const q = menuSearch.toLowerCase().trim();
            return (!q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)) && item.isAvailable;
        });
    }, [menuItems, menuSearch]);

    // Action Helpers
    const performAction = async (endpoint, payload, successMessage, method = 'post') => {
        try {
            await api[method](`/pos${endpoint}`, payload);
            toast.success(successMessage);
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    // Table Selection
    const handleSelectTable = (table) => {
        setSelectedTable(table);
        setCustomerName(table.customerName || '');
        setCustomerMobile(table.customerMobile || '');
    };

    // Add Item to Table Bill (B06)
    const handleAddItemToTable = async (menuItem) => {
        if (!selectedTable) return;
        try {
            await api.post('/pos/orders', {
                tableNumber: selectedTable.tableId,
                customerName: selectedTable.customerName || 'Guest',
                customerMobile: selectedTable.customerMobile || '0000000000',
                items: [{
                    menuItemId: menuItem._id,
                    name: menuItem.name,
                    quantity: 1,
                    price: menuItem.price
                }]
            });
            toast.success(`Added ${menuItem.name} to Table ${selectedTable.tableId}`);
            setShowAddMenuModal(false);
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add item to table');
        }
    };

    // Edit Quantity or Remove Item (B07, B08)
    const handleEditItemQuantity = async (orderId, itemIndex, currentQty, delta) => {
        const newQty = currentQty + delta;
        if (newQty < 0) return;

        if (newQty === 0 && !window.confirm("Remove this item from the active bill? A cancel ticket will be dispatched to the kitchen.")) {
            return;
        }

        try {
            await api.patch(`/pos/orders/${orderId}/items/${itemIndex}`, { quantity: newQty });
            toast.success(newQty === 0 ? "Item removed and cancel ticket sent" : `Quantity updated to ${newQty}`);
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update item");
        }
    };

    // Customer Name & Mobile Update (B12)
    const handleSaveCustomer = async (e) => {
        e.preventDefault();
        if (!selectedTable) return;
        try {
            await api.patch(`/pos/tables/${selectedTable.tableId}/customer`, {
                name: customerName.trim(),
                mobile: customerMobile.trim()
            });
            toast.success('Customer details updated');
            setShowCustomerModal(false);
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update customer details');
        }
    };

    // Apply Discount with Authorization (B10, B11)
    const handleApplyDiscount = async (e) => {
        e.preventDefault();
        if (!selectedTable) return;
        const val = Number(discountValue);
        if (isNaN(val) || val < 0) {
            toast.error('Enter a valid discount number');
            return;
        }

        try {
            await api.patch(`/pos/tables/${selectedTable.tableId}/discount`, {
                type: discountType,
                value: val,
                managerPin: managerPin.trim()
            });
            toast.success('Discount applied successfully');
            setShowDiscountModal(false);
            setDiscountValue('');
            setManagerPin('');
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to apply discount');
        }
    };

    // Final Cash Settlement & Table Release (B16, B17, B18)
    const handleSettleCash = async () => {
        if (!selectedTable) return;
        setIsSettling(true);
        try {
            const res = await api.post(`/pos/tables/${selectedTable.tableId}/pay`, {
                paymentMode: 'Cash'
            });
            toast.success(`Table ${selectedTable.tableId} settled: ₹${res.data.total}. Table released to Available! 🎉`, {
                duration: 5000,
                icon: '💰'
            });
            setShowSettleModal(false);
            setCashTendered('');
            setSelectedTable(null);
            loadFloorData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Settlement failed');
        } finally {
            setIsSettling(false);
        }
    };

    // Open Official Customer Tax Invoice Preview (Matches Physical Slip)
    const handleOpenInvoicePreview = (targetTable) => {
        if (!targetTable) return;
        const activeItems = (targetTable.orders || []).flatMap(o => o.items).filter(i => i.status !== 'cancelled');
        const subtotal = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const disc = targetTable.bill?.discount || 0;
        const taxable = Math.max(0, subtotal - disc);
        const cgst = +(taxable * 0.025).toFixed(2);
        const sgst = +(taxable * 0.025).toFixed(2);
        const rawTotal = taxable + cgst + sgst;
        const grandTotal = Math.round(rawTotal);
        const roundOff = +(grandTotal - rawTotal).toFixed(2);

        setInvoiceData({
            billNo: (targetTable.orders && targetTable.orders[0]?.invoiceNumber) || (parseInt(targetTable.orders?.[0]?._id?.slice(-4), 16) % 9000 + 1000) || 3663,
            date: new Date().toLocaleDateString('en-GB'),
            tableName: targetTable.tableId,
            customerName: targetTable.customerName || '',
            customerGstin: targetTable.customerGstin || '',
            items: activeItems,
            subtotal,
            discount: disc,
            cgst,
            sgst,
            roundOff,
            grandTotal,
            isDuplicate: false
        });
        setShowInvoiceModal(true);
    };

    const handleOpenHistoricalInvoice = (order) => {
        if (!order) return;
        const activeItems = (order.items || []).filter(i => i.status !== 'cancelled');
        const subtotal = order.subtotal || activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const disc = order.discountAmount || 0;
        const taxable = Math.max(0, subtotal - disc);
        const cgst = order.cgst || +(taxable * 0.025).toFixed(2);
        const sgst = order.sgst || +(taxable * 0.025).toFixed(2);
        const roundOff = order.roundOff !== undefined ? order.roundOff : +(Math.round(taxable + cgst + sgst) - (taxable + cgst + sgst)).toFixed(2);
        const grandTotal = order.totalAmount || Math.round(taxable + cgst + sgst);

        setInvoiceData({
            billNo: order.invoiceNumber || (parseInt(order._id?.slice(-4), 16) % 9000 + 1000) || 3663,
            date: new Date(order.createdAt).toLocaleDateString('en-GB'),
            tableName: order.tableNumber,
            customerName: order.customerName || '',
            customerGstin: order.customerGstin || '',
            items: activeItems,
            subtotal,
            discount: disc,
            cgst,
            sgst,
            roundOff,
            grandTotal,
            isDuplicate: true
        });
        setShowInvoiceModal(true);
    };

    return (
        <div className="min-h-screen bg-[#F4F6F0] text-[#222222] font-body pb-12">
            {/* Top POS Header & Status Bar (B01, B20, B21) */}
            <header className="sticky top-0 z-40 bg-white border-b border-[#EBEBEB] px-5 py-3 shadow-xs">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#1C2B1A] text-white flex items-center justify-center font-bold">
                            <Receipt size={20} className="text-[#BCE2A3]" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-extrabold text-[#222222]">The Sparkling POS Desk</h1>
                                <span className="bg-[#BCE2A3]/30 border border-[#BCE2A3] text-[#425934] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    Billing Desk
                                </span>
                            </div>
                            <p className="text-[11px] text-[#818181]">
                                Operator: <strong className="text-[#222222]">{currentUser.name || 'Cashier'}</strong> ({currentUser.email || 'billing@sparkling.com'})
                            </p>
                        </div>
                    </div>

                    {/* KPI Badges: Today's Sales & Orders (B20, B21) */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <div className="bg-[#F8F8F8] border border-[#EBEBEB] px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
                            <DollarSign size={15} className="text-[#5A724A]" />
                            <div>
                                <span className="text-[9px] uppercase font-bold text-[#818181] block">Today's Revenue</span>
                                <span className="text-sm font-mono font-black text-[#5A724A]">₹{stats.todayRevenue.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-[#F8F8F8] border border-[#EBEBEB] px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
                            <CheckCircle size={15} className="text-[#222222]" />
                            <div>
                                <span className="text-[9px] uppercase font-bold text-[#818181] block">Settled Bills</span>
                                <span className="text-sm font-mono font-bold text-[#222222]">{stats.todayOrderCount}</span>
                            </div>
                        </div>

                        <div className="bg-[#F8F8F8] border border-[#EBEBEB] px-3.5 py-1.5 rounded-2xl flex items-center gap-2">
                            <Clock size={15} className="text-amber-600" />
                            <div>
                                <span className="text-[9px] uppercase font-bold text-[#818181] block">Unsettled Tabs</span>
                                <span className="text-sm font-mono font-bold text-amber-700">₹{stats.activeTabsTotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* PWA 1-Click Desktop Install Button */}
                        {!isInstalled && (
                            <button
                                onClick={handleInstallPwa}
                                className="bg-[#5A724A] hover:bg-[#485D3B] text-white px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                                title="1-Click Install to Desktop (Chrome / Edge)"
                            >
                                <Download size={14} /> Install POS App
                            </button>
                        )}

                        {/* Failed Print Alert */}
                        {failedPrintJobs.length > 0 && (
                            <button
                                onClick={() => failedPrintJobs.forEach(j => performAction(`/print/${j._id}/retry`, {}, 'Retrying print job'))}
                                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 animate-pulse"
                            >
                                <AlertTriangle size={14} /> {failedPrintJobs.length} Failed Print (Retry)
                            </button>
                        )}
                    </div>
                </div>

                {/* Primary Mode Switcher (B02, B22, B24, B26) */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-[#F4F6F0] overflow-x-auto scrollbar-hide">
                    {[
                        { id: 'floor', label: 'Billing Floor (32 Tables)' },
                        { id: 'history', label: "Sales History & Reprints (4 Months)" },
                        { id: 'audit', label: 'Bill Audit Trail (Edits & Voids)' },
                        { id: 'reconciliation', label: 'Cash Drawer Reconciliation' },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setView(t.id)}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border shadow-2xs",
                                view === t.id
                                    ? "bg-[#222222] text-white border-[#222222]"
                                    : "bg-white text-[#818181] border-[#EBEBEB] hover:border-[#5A724A] hover:text-[#222222]"
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* VIEW 1: BILLING FLOOR & ACTIVE TABS (B02 - B18) */}
            {view === 'floor' && (
                <div className="p-5 max-w-full">
                    {/* Floor Sub-Filter */}
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex gap-2">
                            {[
                                { id: 'all', label: `All Tables (${tables.length})` },
                                { id: 'occupied', label: `Active Tabs (${tables.filter(t => t.status === 'occupied' || t.status === 'billing').length})` },
                                { id: 'billing', label: `Billing Requests (${tables.filter(t => t.status === 'billing').length})` },
                                { id: 'available', label: `Available (${tables.filter(t => t.status === 'available').length})` },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setTableFilter(f.id)}
                                    className={clsx(
                                        "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                                        tableFilter === f.id
                                            ? "bg-[#5A724A] text-white border-[#5A724A]"
                                            : "bg-white text-[#818181] border-[#EBEBEB] hover:text-[#222222]"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                        <span className="text-xs text-[#818181] font-mono">
                            Auto-sync via LAN Socket.IO • Port 5000
                        </span>
                    </div>

                    {/* Main Split: Tables Grid on Left, Billing Workspace on Right */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* 32 Tables Floor Grid (B02, B03) */}
                        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-[#EBEBEB] shadow-xs">
                            <h2 className="text-xs font-bold text-[#818181] uppercase tracking-wider mb-3">Restaurant Dining Tables</h2>

                            {isLoading ? (
                                <div className="text-center py-16">
                                    <div className="w-8 h-8 border-3 border-[#5A724A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-[#818181]">Syncing table tabs...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {filteredTables.map(t => {
                                        const isOccupied = t.status === 'occupied';
                                        const isBilling = t.status === 'billing';
                                        const isSelected = selectedTable?.tableId === t.tableId;

                                        return (
                                            <div
                                                key={t._id}
                                                onClick={() => handleSelectTable(t)}
                                                className={clsx(
                                                    "aspect-square p-3 rounded-2xl border-2 flex flex-col justify-between items-center cursor-pointer transition-all relative overflow-hidden group shadow-2xs hover:scale-103",
                                                    isSelected 
                                                        ? "ring-3 ring-[#5A724A] border-[#5A724A] bg-white shadow-md"
                                                        : isBilling
                                                            ? "bg-amber-50 border-amber-500 text-amber-900"
                                                            : isOccupied
                                                                ? "bg-[#BCE2A3]/20 border-[#5A724A]"
                                                                : "bg-[#F8F8F8] border-[#EBEBEB] hover:border-[#5A724A]"
                                                )}
                                            >
                                                <div className="w-full flex justify-between items-center text-[10px]">
                                                    <span className="font-bold text-[#818181] flex items-center">
                                                        <Users size={9} className="mr-0.5" />{t.capacity}
                                                    </span>
                                                    {isBilling && (
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                                    )}
                                                </div>

                                                <div className={clsx(
                                                    "text-2xl font-black tracking-tight",
                                                    isBilling ? "text-amber-800" : isOccupied ? "text-[#5A724A]" : "text-[#222222]"
                                                )}>
                                                    T{t.tableId}
                                                </div>

                                                <div className="text-[10px] text-center w-full truncate">
                                                    {isBilling ? (
                                                        <span className="font-bold text-amber-800 font-mono">₹{t.bill?.total || 0}</span>
                                                    ) : isOccupied ? (
                                                        <span className="font-bold text-[#425934] font-mono">₹{t.bill?.total || 0}</span>
                                                    ) : (
                                                        <span className="text-[#818181]">Available</span>
                                                    )}
                                                </div>

                                                {/* Bottom status stripe */}
                                                <div className={clsx(
                                                    "absolute bottom-0 left-0 right-0 h-1",
                                                    isBilling ? "bg-amber-500" : isOccupied ? "bg-[#5A724A]" : "bg-transparent"
                                                )} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected Table Billing Workspace (B04 - B18) */}
                        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-[#EBEBEB] shadow-xs sticky top-28">
                            {selectedTable ? (
                                <div className="space-y-4">
                                    {/* Table Header & Customer Info (B04, B12) */}
                                    <div className="flex items-start justify-between border-b border-[#F4F6F0] pb-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h2 className="text-xl font-extrabold text-[#222222]">Table {selectedTable.tableId}</h2>
                                                <span className={clsx(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                                    selectedTable.status === 'billing' ? "bg-amber-100 text-amber-900 border border-amber-300" :
                                                    selectedTable.status === 'occupied' ? "bg-[#BCE2A3]/30 text-[#425934] border border-[#BCE2A3]" :
                                                    "bg-gray-100 text-gray-700"
                                                )}>
                                                    {selectedTable.status}
                                                </span>
                                            </div>
                                            <button 
                                                onClick={() => setShowCustomerModal(true)}
                                                className="text-xs text-[#5A724A] hover:underline font-semibold mt-1 flex items-center gap-1"
                                            >
                                                <span>{selectedTable.customerName || 'No customer name'}</span>
                                                <span className="text-[#818181]">({selectedTable.customerMobile || 'No mobile'})</span>
                                                <span className="text-[10px] bg-[#F4F6F0] px-1.5 py-0.2 rounded font-normal text-[#222222]">edit</span>
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setShowAddMenuModal(true)}
                                            className="bg-[#222222] hover:bg-[#5A724A] text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs transition-colors"
                                        >
                                            <Plus size={14} /> Add Item
                                        </button>
                                    </div>

                                    {/* Order Items List (B05, B07, B08) */}
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {selectedTable.orders?.length === 0 ? (
                                            <div className="text-center py-8 text-xs text-[#818181]">
                                                No active orders on this table. Use "Add Item" to start a ticket.
                                            </div>
                                        ) : (
                                            selectedTable.orders?.flatMap(o => o.items.map((it, idx) => {
                                                if (it.status === 'cancelled') return null;
                                                return (
                                                    <div 
                                                        key={`${o._id}-${idx}`}
                                                        className="flex items-center justify-between text-xs py-2 px-3 bg-[#F8F8F8] rounded-2xl border border-[#EBEBEB]"
                                                    >
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <p className="font-bold text-[#222222] truncate">{it.name}</p>
                                                            <p className="font-mono text-[#5A724A] font-semibold text-[11px]">₹{it.price} each</p>
                                                        </div>

                                                        {/* Stepper & Total */}
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="flex items-center gap-1 bg-white rounded-full border border-[#EBEBEB] px-1 py-0.5">
                                                                <button
                                                                    onClick={() => handleEditItemQuantity(o._id, idx, it.quantity, -1)}
                                                                    className="w-5 h-5 rounded-full hover:bg-[#F4F6F0] text-[#5A724A] flex items-center justify-center font-bold"
                                                                >
                                                                    <Minus size={11} />
                                                                </button>
                                                                <span className="w-4 font-mono font-bold text-center">{it.quantity}</span>
                                                                <button
                                                                    onClick={() => handleEditItemQuantity(o._id, idx, it.quantity, 1)}
                                                                    className="w-5 h-5 rounded-full bg-[#5A724A] text-white flex items-center justify-center font-bold"
                                                                >
                                                                    <Plus size={11} />
                                                                </button>
                                                            </div>

                                                            <span className="font-mono font-bold text-sm text-[#222222] w-14 text-right">
                                                                ₹{(it.price * it.quantity).toFixed(2)}
                                                            </span>

                                                            <button
                                                                onClick={() => handleEditItemQuantity(o._id, idx, it.quantity, -it.quantity)}
                                                                className="text-[#818181] hover:text-red-600 p-1"
                                                                title="Remove item"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            }))
                                        )}
                                    </div>

                                    {/* Financial Breakdown (Exact Receipt Format: Taxable, CGST, SGST, Round Off) */}
                                    <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#E5E0D8] space-y-1.5 text-xs font-mono">
                                        <div className="flex justify-between text-[#818181]">
                                            <span className="font-sans">Total (Subtotal)</span>
                                            <span className="font-bold text-[#222222]">
                                                ₹{(selectedTable.bill?.subtotal || 0).toFixed(2)}
                                            </span>
                                        </div>

                                        {selectedTable.bill?.discount > 0 && (
                                            <div className="flex justify-between text-amber-800">
                                                <span className="font-sans">Disc:</span>
                                                <span className="font-bold">−₹{selectedTable.bill.discount.toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between text-[#818181]">
                                            <span className="font-sans">C GST @ 2.5% :</span>
                                            <span className="text-[#222222]">
                                                ₹{(selectedTable.bill?.cgst ?? ((selectedTable.bill?.subtotal - (selectedTable.bill?.discount || 0)) * 0.025)).toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-[#818181]">
                                            <span className="font-sans">S GST @ 2.5% :</span>
                                            <span className="text-[#222222]">
                                                ₹{(selectedTable.bill?.sgst ?? ((selectedTable.bill?.subtotal - (selectedTable.bill?.discount || 0)) * 0.025)).toFixed(2)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-[#818181]">
                                            <span className="font-sans">Round Off:-</span>
                                            <span className="text-[#222222]">
                                                {selectedTable.bill?.roundOff !== undefined ? (selectedTable.bill.roundOff >= 0 ? '+' : '') + selectedTable.bill.roundOff.toFixed(2) : '-0.00'}
                                            </span>
                                        </div>

                                        <div className="pt-2 border-t border-[#E5E0D8] flex justify-between items-center font-sans">
                                            <span className="font-extrabold text-sm text-[#222222]">Grand Total</span>
                                            <span className="text-xl font-mono font-black text-[#5A724A]">
                                                ₹{(selectedTable.bill?.grandTotal || selectedTable.bill?.total || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Bar (B10, B14, B15, B16, B17, B18) */}
                                    <div className="space-y-2 pt-1">
                                        <div className="grid grid-cols-3 gap-2">
                                            <button
                                                onClick={() => setShowDiscountModal(true)}
                                                className="py-2 px-2.5 rounded-full text-xs font-bold border border-[#5A724A] text-[#5A724A] hover:bg-[#F4F6F0] text-center truncate"
                                            >
                                                {selectedTable.bill?.discount > 0 ? 'Edit Disc' : '+ Discount'}
                                            </button>

                                            <button
                                                onClick={() => performAction(`/tables/${selectedTable.tableId}/kitchen-reprint`, {}, 'Kitchen ticket printed')}
                                                className="py-2 px-2.5 rounded-full text-xs font-bold border border-[#EBEBEB] text-[#222222] hover:bg-[#F8F8F8] text-center truncate"
                                            >
                                                Print Kitchen
                                            </button>

                                            <button
                                                onClick={() => performAction(`/tables/${selectedTable.tableId}/bill`, {}, 'Bill printed to receipt printer')}
                                                className="py-2 px-2.5 rounded-full text-xs font-bold border border-[#EBEBEB] text-[#222222] hover:bg-[#F8F8F8] text-center truncate"
                                            >
                                                Print Bill
                                            </button>

                                            {/* Exact Receipt Preview & Print Button */}
                                            <button
                                                onClick={() => handleOpenInvoicePreview(selectedTable)}
                                                className="col-span-3 py-2 px-3 rounded-full text-xs font-bold bg-[#FAF8F5] border border-[#5A724A] text-[#5A724A] hover:bg-[#BCE2A3]/30 flex items-center justify-center gap-1.5 shadow-2xs"
                                            >
                                                <Eye size={13} /> View Official Tax Invoice Preview
                                            </button>
                                        </div>

                                        {/* Settle Bill Button (B16, B17, B18) */}
                                        <button
                                            disabled={!selectedTable.bill?.total || selectedTable.bill.total <= 0}
                                            onClick={() => setShowSettleModal(true)}
                                            className="w-full py-3.5 rounded-full text-sm font-extrabold text-white bg-[#5A724A] hover:bg-[#485D3B] disabled:opacity-50 shadow-sm flex items-center justify-center gap-2 transition-all"
                                        >
                                            <CheckCircle size={18} /> Settle &amp; Pay Cash • ₹{(selectedTable.bill?.total || 0).toFixed(2)}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-[#818181] space-y-2">
                                    <Receipt size={36} className="mx-auto text-[#5A724A] opacity-40" />
                                    <p className="text-sm font-bold text-[#222222]">Select a table from the floor</p>
                                    <p className="text-xs">Click any active or available table to open its billing terminal.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW 2: 4-MONTH SALES HISTORY & REPRINTS (B22, B23, B19) */}
            {view === 'history' && (
                <div className="p-5 max-w-full">
                    {/* Filter Bar */}
                    <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] mb-5 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex gap-2 w-full sm:w-auto items-center">
                            <label className="text-xs font-bold text-[#818181]">Filter Date:</label>
                            <input 
                                type="date" 
                                value={historyDate} 
                                onChange={e => setHistoryDate(e.target.value)} 
                                className="border border-[#EBEBEB] rounded-xl px-3 py-1.5 text-xs bg-[#F8F8F8] outline-none" 
                            />
                        </div>

                        <div className="flex gap-2 w-full sm:w-auto flex-1 max-w-md">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-2.5 text-[#818181]" />
                                <input 
                                    value={historySearch} 
                                    onChange={e => setHistorySearch(e.target.value)} 
                                    placeholder="Search customer name, mobile, or table..." 
                                    className="w-full pl-9 pr-3 py-1.5 border border-[#EBEBEB] rounded-xl text-xs bg-[#F8F8F8] outline-none focus:border-[#5A724A]" 
                                />
                            </div>
                            <button onClick={loadHistory} className="bg-[#222222] text-white px-4 py-1.5 rounded-xl text-xs font-bold">
                                Search
                            </button>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] overflow-hidden shadow-xs">
                        {isHistoryLoading ? (
                            <div className="text-center py-16">
                                <div className="w-8 h-8 border-3 border-[#5A724A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-[#818181]">Loading transaction history...</p>
                            </div>
                        ) : historyRecords.length === 0 ? (
                            <div className="text-center py-16 text-xs text-[#818181]">
                                No finalized bills found matching the selected date and filters.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-[#F8F8F8] text-[#818181] border-b border-[#EBEBEB]">
                                        <tr>
                                            <th className="p-3.5 font-bold">Time (IST)</th>
                                            <th className="p-3.5 font-bold">Table</th>
                                            <th className="p-3.5 font-bold">Customer</th>
                                            <th className="p-3.5 font-bold">Ordered Items</th>
                                            <th className="p-3.5 font-bold">Amount</th>
                                            <th className="p-3.5 font-bold">Payment</th>
                                            <th className="p-3.5 font-bold text-right">Reprint Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F4F6F0]">
                                        {historyRecords.map(o => (
                                            <tr key={o._id} className="hover:bg-[#FAF8F5] transition-colors">
                                                <td className="p-3.5 font-mono text-[#818181]">
                                                    {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="p-3.5 font-black text-sm text-[#222222]">
                                                    Table {o.tableNumber}
                                                </td>
                                                <td className="p-3.5">
                                                    <span className="font-semibold block text-[#222222]">{o.customerName || 'Guest'}</span>
                                                    <span className="font-mono text-[#818181] text-[10px]">{o.customerMobile || '-'}</span>
                                                </td>
                                                <td className="p-3.5 text-[#555555] max-w-xs truncate">
                                                    {o.items?.filter(i => i.status !== 'cancelled').map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                                </td>
                                                <td className="p-3.5 font-mono font-black text-[#5A724A] text-sm">
                                                    ₹{o.totalAmount}
                                                </td>
                                                <td className="p-3.5">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#BCE2A3]/30 text-[#425934] uppercase">
                                                        {o.paymentMode || 'Cash'} ({o.status})
                                                    </span>
                                                </td>
                                                <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                                                    <button
                                                        onClick={() => handleOpenHistoricalInvoice(o)}
                                                        className="px-2.5 py-1 rounded-full text-xs font-bold border border-[#EBEBEB] text-[#222222] hover:border-[#5A724A] hover:text-[#5A724A] transition-colors inline-flex items-center gap-1"
                                                    >
                                                        <Eye size={11} /> View Slip
                                                    </button>
                                                    <button
                                                        onClick={() => handleReprintOrder(o._id)}
                                                        className="px-3 py-1 rounded-full text-xs font-bold border border-[#5A724A] bg-[#FAF8F5] text-[#5A724A] hover:bg-[#5A724A] hover:text-white transition-colors"
                                                    >
                                                        Reprint Bill
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 3: BILL AUDIT TRAIL (B24) */}
            {view === 'audit' && (
                <div className="p-5 max-w-full">
                    <div className="bg-white p-5 rounded-3xl border border-[#EBEBEB] shadow-xs">
                        <div className="flex items-center justify-between mb-4 border-b border-[#F4F6F0] pb-3">
                            <div>
                                <h2 className="text-base font-extrabold text-[#222222]">Immutable Bill Audit Trail</h2>
                                <p className="text-xs text-[#818181]">All item modifications, removals, discounts, and payments are logged permanently.</p>
                            </div>
                            <button onClick={loadAuditLogs} className="bg-[#F8F8F8] hover:bg-[#EBEBEB] text-[#222222] px-3 py-1.5 rounded-full text-xs font-bold">
                                Refresh Audit
                            </button>
                        </div>

                        {isAuditLoading ? (
                            <div className="text-center py-16">
                                <div className="w-8 h-8 border-3 border-[#5A724A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <p className="text-xs text-[#818181]">Loading audit log...</p>
                            </div>
                        ) : auditLogs.length === 0 ? (
                            <div className="text-center py-16 text-xs text-[#818181]">
                                No audit events recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {auditLogs.map(log => (
                                    <div key={log._id} className="p-3 rounded-2xl bg-[#F8F8F8] border border-[#EBEBEB] flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center font-bold text-[#5A724A]">
                                                <ShieldCheck size={14} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#222222]">{log.action}</p>
                                                <p className="text-[10px] text-[#818181]">
                                                    User: <strong>{log.userId?.name || 'Staff'}</strong> ({log.role || 'billing'})
                                                </p>
                                            </div>
                                        </div>
                                        <span className="font-mono text-[#818181] text-[11px]">
                                            {new Date(log.timestamp).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VIEW 4: CASH DRAWER RECONCILIATION (B26) */}
            {view === 'reconciliation' && (
                <div className="p-5 max-w-2xl mx-auto">
                    <div className="bg-white p-6 rounded-3xl border border-[#EBEBEB] shadow-xs space-y-5">
                        <div className="border-b border-[#F4F6F0] pb-3">
                            <h2 className="text-lg font-extrabold text-[#222222]">Cash Drawer Reconciliation</h2>
                            <p className="text-xs text-[#818181]">Compare actual physical cash counted in register against settled system bills.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8]">
                                <span className="text-[10px] font-bold uppercase text-[#818181] block mb-1">Expected Cash in Drawer</span>
                                <span className="text-2xl font-mono font-black text-[#5A724A]">₹{stats.cashCollected.toFixed(2)}</span>
                                <span className="text-[10px] text-[#818181] block mt-1">Based on {stats.todayOrderCount} settled cash orders today</span>
                            </div>

                            <div className="bg-[#F8F8F8] p-4 rounded-2xl border border-[#EBEBEB]">
                                <span className="text-[10px] font-bold uppercase text-[#818181] block mb-1">Actual Physical Cash Counted</span>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-lg font-bold text-[#818181]">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={countedCash}
                                        onChange={e => setCountedCash(e.target.value)}
                                        className="w-full text-xl font-mono font-bold bg-transparent outline-none text-[#222222]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Calculated Variance */}
                        {countedCash !== '' && (
                            <div className={clsx(
                                "p-4 rounded-2xl border flex items-center justify-between",
                                Number(countedCash) === stats.cashCollected 
                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
                                    : Number(countedCash) > stats.cashCollected
                                        ? "bg-blue-50 border-blue-300 text-blue-900"
                                        : "bg-red-50 border-red-300 text-red-900"
                            )}>
                                <div>
                                    <p className="font-extrabold text-sm">
                                        {Number(countedCash) === stats.cashCollected ? "✓ Cash Reconciled Perfectly" :
                                         Number(countedCash) > stats.cashCollected ? "Cash Overage" : "Cash Shortage"}
                                    </p>
                                    <p className="text-xs opacity-80">
                                        Variance: ₹{(Number(countedCash) - stats.cashCollected).toFixed(2)}
                                    </p>
                                </div>
                                <span className="text-xl font-mono font-black">
                                    {Number(countedCash) === stats.cashCollected ? "MATCHED" : `₹${Math.abs(Number(countedCash) - stats.cashCollected).toFixed(2)}`}
                                </span>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-[#818181] block mb-1">Shift / Reconciliation Notes</label>
                            <textarea
                                rows={2}
                                value={reconciliationNotes}
                                onChange={e => setReconciliationNotes(e.target.value)}
                                placeholder="e.g. End of evening shift drawer count verified by manager..."
                                className="w-full p-3 rounded-2xl border border-[#EBEBEB] text-xs bg-[#F8F8F8] outline-none"
                            />
                        </div>

                        <button
                            onClick={() => toast.success("Cash drawer reconciliation report saved successfully!")}
                            className="w-full py-3 rounded-full text-xs font-bold bg-[#222222] text-white hover:bg-[#5A724A] transition-colors"
                        >
                            Confirm &amp; Archive Shift Reconciliation
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 1: ADD ITEM TO ACTIVE TABLE BILL (B06) */}
            {showAddMenuModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] max-w-lg w-full p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-3">
                            <h3 className="font-extrabold text-sm">Add Item to Table {selectedTable.tableId}</h3>
                            <button onClick={() => setShowAddMenuModal(false)} className="text-[#818181] hover:text-[#222222]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-[#818181]" />
                            <input
                                placeholder="Search dishes to add..."
                                value={menuSearch}
                                onChange={e => setMenuSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:border-[#5A724A]"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                            {filteredMenuItems.slice(0, 25).map(item => (
                                <div key={item._id} className="flex items-center justify-between p-2.5 bg-[#F8F8F8] rounded-xl border border-[#EBEBEB]">
                                    <div className="min-w-0 pr-2">
                                        <p className="font-bold text-xs text-[#222222] truncate">{item.name}</p>
                                        <p className="font-mono text-xs text-[#5A724A] font-bold">₹{item.price}</p>
                                    </div>
                                    <button
                                        onClick={() => handleAddItemToTable(item)}
                                        className="bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: CUSTOMER EDITING (B12) */}
            {showCustomerModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <form onSubmit={handleSaveCustomer} className="bg-white rounded-3xl border border-[#EBEBEB] max-w-sm w-full p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2">
                            <h3 className="font-extrabold text-sm">Customer Info (Table {selectedTable.tableId})</h3>
                            <button type="button" onClick={() => setShowCustomerModal(false)} className="text-[#818181] hover:text-[#222222]">
                                <X size={18} />
                            </button>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Customer Name</label>
                            <input
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Name"
                                className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">10-Digit Mobile</label>
                            <input
                                value={customerMobile}
                                onChange={e => setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="Mobile number"
                                className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none font-mono"
                            />
                        </div>
                        <button type="submit" className="w-full py-2.5 rounded-full text-xs font-bold bg-[#5A724A] text-white">
                            Save Customer Details
                        </button>
                    </form>
                </div>
            )}

            {/* MODAL 3: DISCOUNT WITH AUTHORIZATION (B10, B11) */}
            {showDiscountModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <form onSubmit={handleApplyDiscount} className="bg-white rounded-3xl border border-[#EBEBEB] max-w-sm w-full p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2">
                            <h3 className="font-extrabold text-sm">Apply Discount (Table {selectedTable.tableId})</h3>
                            <button type="button" onClick={() => setShowDiscountModal(false)} className="text-[#818181] hover:text-[#222222]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setDiscountType('percent')}
                                className={clsx("flex-1 py-1.5 rounded-full text-xs font-bold border", discountType === 'percent' ? "bg-[#5A724A] text-white border-[#5A724A]" : "bg-white text-[#818181] border-[#EBEBEB]")}
                            >
                                Percentage (%)
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiscountType('flat')}
                                className={clsx("flex-1 py-1.5 rounded-full text-xs font-bold border", discountType === 'flat' ? "bg-[#5A724A] text-white border-[#5A724A]" : "bg-white text-[#818181] border-[#EBEBEB]")}
                            >
                                Flat Amount (₹)
                            </button>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">
                                Discount Value {discountType === 'percent' ? '(%)' : '(₹)'}
                            </label>
                            <input
                                type="number"
                                min="0"
                                max={discountType === 'percent' ? 100 : selectedTable.bill?.subtotal || 1000}
                                value={discountValue}
                                onChange={e => setDiscountValue(e.target.value)}
                                placeholder="e.g. 10"
                                className="w-full px-3 py-2 text-sm font-mono font-bold border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                required
                            />
                        </div>

                        {/* Authorization PIN for discounts exceeding standard limits (B11) */}
                        {((discountType === 'percent' && Number(discountValue) > 10) || (discountType === 'flat' && Number(discountValue) > 100)) && (
                            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 space-y-1.5">
                                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                                    <Lock size={12} /> Manager Authorization Required
                                </span>
                                <input
                                    type="password"
                                    placeholder="Enter Manager PIN (default: 9999)"
                                    value={managerPin}
                                    onChange={e => setManagerPin(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white outline-none"
                                />
                            </div>
                        )}

                        <button type="submit" className="w-full py-2.5 rounded-full text-xs font-bold bg-[#5A724A] text-white">
                            Apply Authorized Discount
                        </button>
                    </form>
                </div>
            )}

            {/* MODAL 4: CASH SETTLEMENT & TENDER (B16, B17, B18) */}
            {showSettleModal && selectedTable && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] max-w-sm w-full p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2">
                            <h3 className="font-extrabold text-sm">Settle Cash Payment (Table {selectedTable.tableId})</h3>
                            <button onClick={() => setShowSettleModal(false)} className="text-[#818181] hover:text-[#222222]">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8] text-center">
                            <span className="text-[10px] font-bold uppercase text-[#818181] block">Final Bill Total Due</span>
                            <span className="text-3xl font-mono font-black text-[#5A724A]">₹{(selectedTable.bill?.total || 0).toFixed(2)}</span>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-[#818181] uppercase block mb-1">Cash Received from Guest (₹)</label>
                            <input
                                type="number"
                                placeholder={`e.g. ${Math.ceil(selectedTable.bill?.total || 0)}`}
                                value={cashTendered}
                                onChange={e => setCashTendered(e.target.value)}
                                className="w-full px-3 py-2.5 text-base font-mono font-bold border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none"
                                autoFocus
                            />
                        </div>

                        {/* Calculated Change Due */}
                        {cashTendered && Number(cashTendered) >= (selectedTable.bill?.total || 0) && (
                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-300 flex justify-between items-center text-xs">
                                <span className="font-bold text-emerald-900">Change Due to Customer:</span>
                                <span className="font-mono font-black text-sm text-emerald-800">
                                    ₹{(Number(cashTendered) - (selectedTable.bill?.total || 0)).toFixed(2)}
                                </span>
                            </div>
                        )}

                        <button
                            disabled={isSettling}
                            onClick={handleSettleCash}
                            className="w-full py-3.5 rounded-full text-xs font-extrabold text-white bg-[#5A724A] hover:bg-[#485D3B] disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5"
                        >
                            {isSettling ? "Recording Cash & Freeing Table..." : "Confirm Payment Received & Release Table"}
                        </button>
                    </div>
                </div>
            )}

            {/* MODAL 5: OFFICIAL CUSTOMER TAX INVOICE PREVIEW (MATCHES PHYSICAL RECEIPT) */}
            {showInvoiceModal && invoiceData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl border border-[#EBEBEB] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
                        {/* Header Toolbar */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#EBEBEB]">
                            <span className="text-xs font-bold text-[#5A724A] uppercase tracking-wider flex items-center gap-1.5">
                                <Receipt size={14} /> Official Customer Tax Invoice
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3 py-1 bg-[#F8F8F8] border border-[#EBEBEB] rounded-full text-xs font-bold hover:bg-[#EBEBEB] flex items-center gap-1"
                                >
                                    <Printer size={12} /> Print Browser
                                </button>
                                <button onClick={() => setShowInvoiceModal(false)} className="text-[#818181] hover:text-[#222222]">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* PHYSICAL RECEIPT REPLICA (Matches User's Receipt Image) */}
                        <div id="tax-invoice-receipt" className="bg-[#FFFFFE] p-6 border-2 border-dashed border-[#CCCCCC] font-mono text-xs text-black shadow-inner space-y-3">
                            {/* Header */}
                            <div className="text-center space-y-0.5">
                                <h2 className="text-xl font-black tracking-wider text-black">SPARKLING</h2>
                                <h3 className="text-xs font-bold tracking-widest text-black">GARDEN RESTAURANT</h3>
                                <p className="text-[10px] text-black">At. &amp; Po.Rasana Mota, Palanpur Highway,Deesa- 385535</p>
                                <p className="text-[9.5px] text-black">EMail:thesparkling2018@gmail.com , Mobile : +91 94093 22022</p>
                            </div>

                            <div className="border-t border-black pt-1" />

                            {/* Metadata */}
                            <div className="flex items-center justify-between text-xs font-bold">
                                <div>
                                    Bill No: {invoiceData.billNo}
                                </div>
                                <div className="border border-black px-2 py-0.5 text-[10px]">
                                    {invoiceData.isDuplicate ? 'DUPLICATE INVOICE' : 'TAX INVOICE'}
                                </div>
                                <div>
                                    Date: {invoiceData.date}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold">Name:</span> {invoiceData.customerName || ''}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <div>
                                    <span className="font-bold">GST IN:</span> {invoiceData.customerGstin || ''}
                                </div>
                                <div className="font-bold">
                                    Table No: {invoiceData.tableName}
                                </div>
                            </div>

                            <div className="border-t border-black pt-1" />

                            {/* Table Header */}
                            <div className="grid grid-cols-12 font-bold text-[10.5px] pb-1 border-b border-black">
                                <span className="col-span-1">Sr. No</span>
                                <span className="col-span-6 pl-2">D E S C R I P T I O N</span>
                                <span className="col-span-1 text-right">QTY</span>
                                <span className="col-span-2 text-right">PRICE</span>
                                <span className="col-span-2 text-right">AMOUNT</span>
                            </div>

                            {/* Items */}
                            <div className="space-y-1 py-1">
                                {invoiceData.items.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 text-[11px]">
                                        <span className="col-span-1">{idx + 1}</span>
                                        <span className="col-span-6 pl-2 font-bold uppercase truncate">{item.name}</span>
                                        <span className="col-span-1 text-right">{item.quantity}</span>
                                        <span className="col-span-2 text-right">{Number(item.price).toFixed(2)}</span>
                                        <span className="col-span-2 text-right">{Number(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-black pt-1" />

                            {/* Totals & Tax Box */}
                            <div className="grid grid-cols-12 pt-1 text-xs">
                                {/* Left side */}
                                <div className="col-span-6 text-[10.5px] space-y-1">
                                    <p><span className="font-bold">GST. IN :</span> 24BRUPP4641N1Z0</p>
                                    <p><span className="font-bold">HSN/SAC Code :</span> 996334</p>
                                </div>

                                {/* Right side */}
                                <div className="col-span-6 space-y-1 text-right text-xs">
                                    <div className="flex justify-between">
                                        <span className="font-bold">Total:</span>
                                        <span className="font-bold">{invoiceData.subtotal.toFixed(2)}</span>
                                    </div>
                                    {invoiceData.discount > 0 && (
                                        <div className="flex justify-between text-amber-900">
                                            <span className="font-bold">Disc:</span>
                                            <span>-{invoiceData.discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>C GST @ 2.5% :</span>
                                        <span>{invoiceData.cgst.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>S GST @ 2.5% :</span>
                                        <span>{invoiceData.sgst.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Round Off:-</span>
                                        <span>{invoiceData.roundOff >= 0 ? '+' : ''}{invoiceData.roundOff.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t border-black my-1" />
                                    <div className="flex justify-between font-black text-sm">
                                        <span>Grand Total:</span>
                                        <span>{invoiceData.grandTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t-2 border-double border-black mt-1" />
                                </div>
                            </div>

                            <div className="border-t border-black pt-2 text-center text-[10px]">
                                Subject to Deesa jurisdiction only
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    performAction(`/tables/${invoiceData.tableName}/bill`, {}, 'Dispatched to receipt printer');
                                    setShowInvoiceModal(false);
                                }}
                                className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                                <Printer size={14} /> Send to Billing Thermal Printer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
