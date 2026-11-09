import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { 
    Users, Clock, CheckCircle, Bell, Download, RefreshCw, Plus, Minus, 
    Trash2, Search, Utensils, ShoppingBag, Receipt, ChefHat, 
    Send, AlertCircle, Phone, X, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Button } from '../../components/ui/Button';
import { 
    getTables, getKitchenOrders, updateTable, 
    createWaiterOrder, editOrderItem, api, socket 
} from '../../services/api';
import toast from 'react-hot-toast';

export default function WaiterDashboard() {
    // Current Waiter User from localStorage
    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    // Floor & Orders State
    const [tables, setTables] = useState([]);
    const [activeOrders, setActiveOrders] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState(null);
    const [callingTables, setCallingTables] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all'); // all, available, occupied, billing, calling
    const [isGeneratingBill, setIsGeneratingBill] = useState(false);

    // Modal View & Order Creation State
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'menu'
    const [customerName, setCustomerName] = useState('');
    const [customerMobile, setCustomerMobile] = useState('');
    const [menuSearch, setMenuSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [waiterCart, setWaiterCart] = useState([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

    // Fetch Floor Tables, Active Orders, and Menu
    const fetchData = async () => {
        try {
            const [tableData, ordersData, menuRes] = await Promise.all([
                getTables(),
                getKitchenOrders(),
                api.get('/menu').catch(() => ({ data: [] }))
            ]);

            setActiveOrders(ordersData || []);
            setMenuItems(menuRes.data || []);

            const ordersByTable = (ordersData || []).reduce((acc, order) => {
                const key = Number(order.tableNumber);
                if (!acc[key]) {
                    acc[key] = { total: 0, count: 0, orders: [], latestStatus: 'Pending', name: '', mobile: '' };
                }
                acc[key].total += Number(order.totalAmount || 0);
                acc[key].count += 1;
                acc[key].orders.push(order);
                acc[key].latestStatus = order.status;
                if (order.customerName) acc[key].name = order.customerName;
                if (order.customerMobile) acc[key].mobile = order.customerMobile;
                return acc;
            }, {});

            const merged = (tableData || []).map((table) => {
                const key = Number(table.tableId);
                const summary = ordersByTable[key];

                if (!summary) {
                    return {
                        ...table,
                        status: table.status || 'available',
                        currentBill: 0,
                        activeOrderCount: 0,
                        orders: [],
                        displayName: table.customerName || '',
                        displayMobile: table.customerMobile || '',
                    };
                }

                return {
                    ...table,
                    status: table.status === 'billing' ? 'billing' : 'occupied',
                    currentBill: Number(summary.total.toFixed(2)),
                    activeOrderCount: summary.count,
                    orders: summary.orders,
                    displayName: summary.name || table.customerName || '',
                    displayMobile: summary.mobile || table.customerMobile || '',
                    latestStatus: summary.latestStatus
                };
            });

            // Filter out table 13 if present (enforcing restaurant spec)
            const validTables = merged.filter(t => t.tableId !== 13);
            setTables(validTables);

            setSelectedTable(prev => {
                if (!prev) return null;
                return validTables.find(t => t.tableId === prev.tableId) || null;
            });

            setIsLoading(false);
        } catch (error) {
            console.error("Failed to fetch waiter dashboard data:", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        socket.on('table_update', () => fetchData());
        socket.on('new_order', () => fetchData());
        socket.on('order_status_update', (updatedOrder) => {
            fetchData();
            toast(`Table ${updatedOrder.tableNumber}: status changed to ${updatedOrder.status}`, {
                icon: updatedOrder.status === 'Ready' ? '🎉' : updatedOrder.status === 'Served' ? '🍽️' : '📋',
                duration: 3500,
            });
        });

        socket.on('waiter_called', (data) => {
            const calledTableId = parseInt(data.tableId, 10);
            setCallingTables(prev => {
                if (!prev.includes(calledTableId)) return [...prev, calledTableId];
                return prev;
            });
            toast(`🔔 Table ${calledTableId} requested waiter service!`, {
                icon: '🔔',
                duration: 6000,
            });
        });

        return () => {
            socket.off('table_update');
            socket.off('new_order');
            socket.off('order_status_update');
            socket.off('waiter_called');
        };
    }, []);

    // Filtered Tables
    const filteredTables = useMemo(() => {
        return tables.filter(table => {
            if (statusFilter === 'available') return table.status === 'available';
            if (statusFilter === 'occupied') return table.status === 'occupied';
            if (statusFilter === 'billing') return table.status === 'billing';
            if (statusFilter === 'calling') return callingTables.includes(table.tableId);
            return true;
        });
    }, [tables, statusFilter, callingTables]);

    // Categories for Menu Browse
    const menuCategories = useMemo(() => {
        const cats = Array.from(new Set(menuItems.map(item => item.category))).filter(Boolean);
        return ['All', ...cats];
    }, [menuItems]);

    // Filtered Menu Items for Order Creation
    const filteredMenuItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
            const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
            return matchesSearch && matchesCat && item.isAvailable;
        });
    }, [menuItems, menuSearch, selectedCategory]);

    // Summary counts
    const counts = useMemo(() => {
        const occupied = tables.filter(t => t.status === 'occupied').length;
        const billing = tables.filter(t => t.status === 'billing').length;
        const available = tables.filter(t => t.status === 'available').length;
        const readyOrders = activeOrders.filter(o => o.status === 'Ready').length;
        return { occupied, billing, available, readyOrders, calling: callingTables.length };
    }, [tables, activeOrders, callingTables]);

    // Table click
    const handleTableClick = (table) => {
        setSelectedTable(table);
        setActiveTab('details');
        setWaiterCart([]);
        setCustomerName(table.displayName || '');
        setCustomerMobile(table.displayMobile || '');
        if (callingTables.includes(table.tableId)) {
            setCallingTables(prev => prev.filter(id => id !== table.tableId));
        }
    };

    // Seat guests / start session
    const handleSeatGuests = async () => {
        if (!selectedTable) return;
        try {
            await updateTable(selectedTable._id, {
                status: 'occupied',
                sessionStart: new Date(),
                customerName: customerName.trim(),
                customerMobile: customerMobile.trim()
            });
            toast.success(`Table ${selectedTable.tableId} seated. Now add order.`);
            fetchData();
            setActiveTab('menu');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to seat table');
        }
    };

    // Waiter cart actions
    const addToCart = (item) => {
        setWaiterCart(prev => {
            const existing = prev.find(i => (i._id || i.id) === (item._id || item.id));
            if (existing) {
                return prev.map(i => (i._id || i.id) === (item._id || item.id) ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
    };

    const updateCartQty = (id, delta) => {
        setWaiterCart(prev => prev.map(i => {
            if ((i._id || i.id) === id) {
                const newQ = i.quantity + delta;
                return newQ > 0 ? { ...i, quantity: newQ } : null;
            }
            return i;
        }).filter(Boolean));
    };

    const cartTotal = useMemo(() => {
        return waiterCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [waiterCart]);

    // Submit Order to Kitchen (W07, W10, W14, W16)
    const handleSendOrderToKitchen = async () => {
        if (!waiterCart.length) {
            toast.error("Add at least one item to order");
            return;
        }

        setIsSubmittingOrder(true);
        try {
            const payload = {
                tableNumber: selectedTable.tableId,
                customerName: customerName.trim() || selectedTable.displayName || 'Guest',
                customerMobile: customerMobile.trim() || selectedTable.displayMobile || '0000000000',
                waiterName: currentUser.name || 'Staff Waiter',
                waiterId: currentUser._id || undefined,
                items: waiterCart.map(item => ({
                    menuItem: item._id || item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            await createWaiterOrder(payload);
            toast.success(`Order sent to kitchen for Table ${selectedTable.tableId}! 🍳`, { icon: '✅' });
            setWaiterCart([]);
            setActiveTab('details');
            fetchData();
        } catch (error) {
            console.error("Failed to place waiter order:", error);
            toast.error(error.response?.data?.message || "Failed to submit order to kitchen");
        } finally {
            setIsSubmittingOrder(false);
        }
    };

    // Mark Order as Served (W12)
    const handleMarkServed = async (orderId) => {
        try {
            await api.put(`/orders/${orderId}/status`, { status: 'Served' });
            toast.success("Dish marked as Served to guests! 🍽️");
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update order status");
        }
    };

    // Edit Item Quantity or Request Cancellation (W08, W09, W13)
    const handleEditItemQty = async (orderId, itemIdx, currentQty, delta, itemName = 'Item') => {
        const newQty = currentQty + delta;
        if (newQty < 0) return;

        if (newQty === 0 && !window.confirm(`Cancel ${currentQty}x "${itemName}"? A cancellation receipt will be sent to the kitchen.`)) {
            return;
        }

        try {
            await editOrderItem(orderId, itemIdx, newQty);
            if (newQty === 0) {
                toast.success(`Cancelled ${currentQty}x ${itemName} → Kitchen cancellation ticket sent!`);
            } else if (newQty < currentQty) {
                const diff = currentQty - newQty;
                toast.success(`Reduced to ${newQty}x ${itemName} (${diff}x cancelled) → Sent to kitchen!`);
            } else {
                const diff = newQty - currentQty;
                toast.success(`Increased to ${newQty}x ${itemName} (+${diff}x add-on) → Sent to kitchen!`);
            }
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update item");
        }
    };

    const handlePromptDirectQty = async (orderId, itemIdx, currentQty, itemName = 'Item') => {
        const input = window.prompt(`Edit quantity for "${itemName}" (Current: ${currentQty}). Enter 0 to cancel:`, String(currentQty));
        if (input === null) return;
        const targetQty = parseInt(input.trim(), 10);
        if (isNaN(targetQty) || targetQty < 0) {
            toast.error("Please enter a valid positive number or 0.");
            return;
        }
        if (targetQty === currentQty) return;
        const delta = targetQty - currentQty;
        await handleEditItemQty(orderId, itemIdx, currentQty, delta, itemName);
    };

    // Request Billing / Mark table as Billing (W04)
    const handleRequestBilling = async () => {
        if (!selectedTable) return;
        try {
            await updateTable(selectedTable._id, { status: 'billing' });
            toast.success(`Table ${selectedTable.tableId} marked as Billing Request!`);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to request billing");
        }
    };

    // Print Bill Receipt (PDF)
    const handleGenerateBill = async (tableId) => {
        setIsGeneratingBill(true);
        try {
            const response = await api.get(`/reports/bill/table/${tableId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `table-${tableId}-bill.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success(`Bill downloaded for Table ${tableId}`);
        } catch (error) {
            console.error('Failed to generate bill:', error);
            toast.error(error?.response?.data?.message || 'Failed to generate table bill');
        } finally {
            setIsGeneratingBill(false);
        }
    };

    return (
        <div className="text-[#222222] max-w-full pb-12">
            {/* Top Bar with Employee identification (W16) */}
            <div className="mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">Waiter Service Desk</h1>
                        <span className="bg-[#BCE2A3]/30 border border-[#BCE2A3] text-[#425934] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                            Staff Waiter
                        </span>
                    </div>
                    <p className="text-[#818181] text-xs mt-0.5">
                        Logged in as: <strong className="text-[#222222]">{currentUser.name || 'Waiter'}</strong> ({currentUser.email || 'waiter@sparkling.com'}) · 32 Valid Tables (1-33 excl. 13)
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => {
                            setCallingTables([]);
                            fetchData();
                            toast.success('Floor status refreshed');
                        }}
                        className="bg-white hover:bg-[#F8F8F8] text-[#222222] border border-[#EBEBEB] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                        <RefreshCw size={13} /> Refresh Floor
                    </button>
                </div>
            </div>

            {/* Quick Metrics (W02) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#5A724A] text-white flex items-center justify-center font-bold">
                        <Users size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#818181] uppercase tracking-wider block">Occupied</span>
                        <span className="text-xl font-mono font-extrabold text-[#222222]">{counts.occupied} <span className="text-xs text-[#818181] font-normal">/ 32</span></span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                        <Receipt size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#818181] uppercase tracking-wider block">Billing Pending</span>
                        <span className="text-xl font-mono font-extrabold text-amber-700">{counts.billing}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                        <ChefHat size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#818181] uppercase tracking-wider block">Ready to Serve</span>
                        <span className="text-xl font-mono font-extrabold text-emerald-700">{counts.readyOrders}</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex items-center gap-3">
                    <div className={clsx(
                        "w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-all",
                        counts.calling > 0 ? "bg-red-500 text-white animate-bounce" : "bg-[#F4F6F0] text-[#818181]"
                    )}>
                        <Bell size={18} />
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[#818181] uppercase tracking-wider block">Assistance Calls</span>
                        <span className={clsx("text-xl font-mono font-extrabold", counts.calling > 0 ? "text-red-600" : "text-[#222222]")}>{counts.calling}</span>
                    </div>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                {[
                    { id: 'all', label: `All Tables (${tables.length})` },
                    { id: 'occupied', label: `Occupied (${counts.occupied})` },
                    { id: 'billing', label: `Billing (${counts.billing})` },
                    { id: 'available', label: `Available (${counts.available})` },
                    { id: 'calling', label: `Calling (${counts.calling})`, alert: counts.calling > 0 },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id)}
                        className={clsx(
                            "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-xs border",
                            statusFilter === tab.id
                                ? "bg-[#222222] text-white border-[#222222]"
                                : tab.alert 
                                    ? "bg-red-50 text-red-700 border-red-300 animate-pulse"
                                    : "bg-white text-[#818181] border-[#EBEBEB] hover:border-[#5A724A] hover:text-[#222222]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 32 Tables Grid (W03, W04) */}
            <Card className="bg-white border border-[#EBEBEB] p-5 sm:p-6 shadow-[0_4px_24px_rgba(90,114,74,0.06)] rounded-3xl min-h-[420px]">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-8 h-8 border-3 border-[#5A724A] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                        <AnimatePresence>
                            {filteredTables.map((table) => {
                                const isCalling = callingTables.includes(table.tableId);
                                const isBilling = table.status === 'billing';
                                const isOccupied = table.status === 'occupied';

                                return (
                                    <motion.div
                                        key={table._id}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => handleTableClick(table)}
                                        className={clsx(
                                            "aspect-square p-3 rounded-2xl border-2 flex flex-col justify-between items-center cursor-pointer hover:scale-104 transition-all w-full relative overflow-hidden group shadow-2xs",
                                            isCalling
                                                ? "bg-red-50 border-red-500 shadow-md ring-2 ring-red-300 animate-pulse"
                                                : isBilling
                                                    ? "bg-amber-50 border-amber-500 shadow-sm"
                                                    : isOccupied
                                                        ? "bg-[#BCE2A3]/25 border-[#5A724A] shadow-xs"
                                                        : "bg-[#F8F8F8] border-[#EBEBEB] hover:border-[#5A724A] hover:bg-white"
                                        )}
                                    >
                                        <div className="w-full flex justify-between items-center text-[10px]">
                                            <span className="flex items-center bg-white/80 border border-[#EBEBEB] px-1.5 py-0.5 rounded-full font-bold text-[#818181]">
                                                <Users size={9} className="mr-0.5" />
                                                {table.capacity}
                                            </span>
                                            {isCalling && (
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                                            )}
                                        </div>

                                        <div className={clsx(
                                            "text-2xl font-black tracking-tight",
                                            isCalling ? "text-red-700" : isBilling ? "text-amber-800" : isOccupied ? "text-[#5A724A]" : "text-[#222222]"
                                        )}>
                                            T{table.tableId}
                                        </div>

                                        <div className="text-[10px] text-center w-full truncate">
                                            {isCalling ? (
                                                <span className="font-bold text-red-600">Assistance</span>
                                            ) : isBilling ? (
                                                <span className="font-bold text-amber-700">Billing ₹{table.currentBill}</span>
                                            ) : isOccupied ? (
                                                <span className="font-mono font-bold text-[#425934]">₹{table.currentBill}</span>
                                            ) : (
                                                <span className="text-[#818181] font-medium">Available</span>
                                            )}
                                        </div>

                                        {/* Status bottom bar */}
                                        <div className={clsx(
                                            "absolute bottom-0 left-0 right-0 h-1",
                                            isCalling ? "bg-red-500" : isBilling ? "bg-amber-500" : isOccupied ? "bg-[#5A724A]" : "bg-transparent"
                                        )} />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </Card>

            {/* Table Detail & Order Workspace Modal */}
            <Modal 
                isOpen={!!selectedTable} 
                onClose={() => { setSelectedTable(null); setWaiterCart([]); }} 
                title={`Table ${selectedTable?.tableId} — Service Workspace`}
            >
                {selectedTable && (
                    <div className="space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-[#EBEBEB] pb-2 gap-2">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={clsx(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all",
                                    activeTab === 'details'
                                        ? "bg-[#5A724A] text-white"
                                        : "bg-[#F8F8F8] text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                <Utensils size={14} /> Table &amp; Orders ({selectedTable.orders?.length || 0})
                            </button>
                            <button
                                onClick={() => setActiveTab('menu')}
                                className={clsx(
                                    "flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all relative",
                                    activeTab === 'menu'
                                        ? "bg-[#5A724A] text-white"
                                        : "bg-[#F8F8F8] text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                <Plus size={14} /> Take / Add Order
                                {waiterCart.length > 0 && (
                                    <span className="w-5 h-5 bg-[#BCE2A3] text-[#222222] rounded-full text-[10px] font-black flex items-center justify-center">
                                        {waiterCart.reduce((s, i) => s + i.quantity, 0)}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Customer Identification (W05) */}
                        <div className="bg-[#F8F8F8] p-3.5 rounded-2xl border border-[#EBEBEB] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#818181] block mb-1">Customer Name</label>
                                <input
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full px-3 py-1.5 rounded-xl border border-[#EBEBEB] bg-white text-xs outline-none focus:border-[#5A724A]"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-[#818181] block mb-1">Mobile (10 digits)</label>
                                <input
                                    value={customerMobile}
                                    onChange={e => setCustomerMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    placeholder="e.g. 9876543210"
                                    className="w-full px-3 py-1.5 rounded-xl border border-[#EBEBEB] bg-white text-xs outline-none focus:border-[#5A724A]"
                                />
                            </div>
                        </div>

                        {/* TAB 1: DETAILS & ACTIVE ORDERS */}
                        {activeTab === 'details' && (
                            <div className="space-y-4">
                                {selectedTable.status === 'available' && !selectedTable.orders?.length ? (
                                    <div className="text-center py-8">
                                        <div className="w-14 h-14 bg-[#BCE2A3]/30 text-[#5A724A] rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Users size={24} />
                                        </div>
                                        <h4 className="font-extrabold text-sm text-[#222222]">Table is Currently Available</h4>
                                        <p className="text-xs text-[#818181] mt-1 max-w-xs mx-auto mb-4">
                                            Seat incoming guests or take their order directly to start a dining session.
                                        </p>
                                        <div className="flex gap-2 justify-center">
                                            <Button onClick={handleSeatGuests} variant="primary" className="rounded-full text-xs py-2.5 px-5">
                                                Seat Guests
                                            </Button>
                                            <Button onClick={() => setActiveTab('menu')} variant="outline" className="rounded-full text-xs py-2.5 px-5">
                                                Take Order Now
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Status Header */}
                                        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#EBEBEB]">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase text-[#818181] tracking-wider block">Running Bill</span>
                                                <span className="text-xl font-mono font-extrabold text-[#5A724A]">₹{selectedTable.currentBill || 0}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold uppercase text-[#818181] tracking-wider block">Table Status</span>
                                                <span className={clsx(
                                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block",
                                                    selectedTable.status === 'billing' ? "bg-amber-100 text-amber-800" : "bg-[#BCE2A3]/30 text-[#425934]"
                                                )}>
                                                    {selectedTable.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Orders List (W08, W09, W11, W12, W13) */}
                                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                            {selectedTable.orders?.map((order, orderIdx) => (
                                                <div key={order._id} className="bg-white p-3.5 rounded-2xl border border-[#EBEBEB] space-y-2.5 shadow-2xs">
                                                    <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[#222222]">Batch #{orderIdx + 1}</span>
                                                            {order.isAddOn && (
                                                                <span className="bg-[#5A724A] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                                                                    Add-On
                                                                </span>
                                                            )}
                                                            {order.waiterName && (
                                                                <span className="text-[10px] text-[#818181]">by {order.waiterName}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={clsx(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                                order.status === 'Ready' ? "bg-emerald-100 text-emerald-800 animate-pulse" :
                                                                order.status === 'Served' ? "bg-gray-100 text-gray-700" :
                                                                order.status === 'Preparing' ? "bg-orange-100 text-orange-800" :
                                                                "bg-amber-100 text-amber-800"
                                                            )}>
                                                                {order.status}
                                                            </span>
                                                            {order.status === 'Ready' && (
                                                                <button
                                                                    onClick={() => handleMarkServed(order._id)}
                                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs"
                                                                >
                                                                    Mark Served
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Items in order */}
                                                    <div className="space-y-1.5">
                                                        {order.items?.map((item, itemIdx) => (
                                                            <div key={itemIdx} className="flex items-center justify-between text-xs py-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={clsx(
                                                                        "font-semibold",
                                                                        item.status === 'cancelled' ? "line-through text-red-500" : "text-[#222222]"
                                                                    )}>
                                                                        {item.name}
                                                                    </span>
                                                                    {item.status === 'cancelled' && (
                                                                        <span className="text-[9px] text-red-600 bg-red-50 px-1 rounded font-bold">CANCELLED</span>
                                                                    )}
                                                                </div>

                                                                {item.status !== 'cancelled' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-[#5A724A] font-bold">₹{item.price * item.quantity}</span>
                                                                        {/* Inline Edit Quantity / Cancel (W09, W13) */}
                                                                        <div className="flex items-center gap-1 bg-[#F4F6F0] rounded-full px-1.5 py-0.5 border border-[#EBEBEB]">
                                                                            <button
                                                                                onClick={() => handleEditItemQty(order._id, itemIdx, item.quantity, -1, item.name)}
                                                                                className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#5A724A] hover:bg-rose-500 hover:text-white transition-colors shadow-2xs"
                                                                                title="Decrease quantity (reduces & sends cancellation to kitchen)"
                                                                            >
                                                                                <Minus size={10} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handlePromptDirectQty(order._id, itemIdx, item.quantity, item.name)}
                                                                                className="font-mono font-bold w-6 text-center text-xs hover:bg-[#BCE2A3]/40 rounded transition-colors"
                                                                                title="Click to enter exact quantity or cancel item"
                                                                            >
                                                                                {item.quantity}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleEditItemQty(order._id, itemIdx, item.quantity, 1, item.name)}
                                                                                className="w-5 h-5 rounded-full bg-[#5A724A] text-white flex items-center justify-center hover:bg-[#485D3B] transition-colors shadow-2xs"
                                                                                title="Increase quantity (sends add-on to kitchen)"
                                                                            >
                                                                                <Plus size={10} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="font-mono text-[#818181] line-through text-[11px]">₹{item.price * item.quantity}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action Buttons: Add Orders, Billing Request, Bill Download */}
                                        <div className="pt-2 border-t border-[#EBEBEB] space-y-2">
                                            <div className="flex gap-2 flex-wrap">
                                                <Button
                                                    onClick={() => setActiveTab('menu')}
                                                    variant="primary"
                                                    className="flex-1 rounded-full text-xs py-2.5"
                                                >
                                                    <Plus size={14} /> Add More Dishes (Add-On)
                                                </Button>

                                                {selectedTable.status !== 'billing' ? (
                                                    <Button
                                                        onClick={handleRequestBilling}
                                                        variant="outline"
                                                        className="flex-1 rounded-full text-xs py-2.5 border-amber-400 text-amber-800 hover:bg-amber-50"
                                                    >
                                                        <Receipt size={14} /> Request Billing
                                                    </Button>
                                                ) : (
                                                    <span className="flex-1 text-center py-2.5 px-3 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                                        Billing Requested
                                                    </span>
                                                )}

                                                <Button
                                                    onClick={() => handleGenerateBill(selectedTable.tableId)}
                                                    disabled={isGeneratingBill}
                                                    variant="outline"
                                                    className="rounded-full text-xs py-2.5 px-4"
                                                    title="Print / Download PDF Bill"
                                                >
                                                    {isGeneratingBill ? <div className="w-3.5 h-3.5 border-2 border-[#5A724A] border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
                                                </Button>
                                            </div>

                                            {/* Permission notice banner enforcing role constraints */}
                                            <div className="p-2.5 bg-[#F8F8F8] rounded-xl border border-[#EBEBEB] flex items-center gap-2 text-[11px] text-[#818181]">
                                                <AlertCircle size={14} className="text-[#5A724A] shrink-0" />
                                                <span>Final settlement and cash collection are handled exclusively at the Billing Desk (/pos).</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* TAB 2: MENU & TAKE ORDER (W06, W07, W10, W14) */}
                        {activeTab === 'menu' && (
                            <div className="space-y-3">
                                {/* Search and categories */}
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-2.5 text-[#818181]" />
                                    <input
                                        type="text"
                                        placeholder="Search food by name..."
                                        value={menuSearch}
                                        onChange={e => setMenuSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#EBEBEB] bg-[#F8F8F8] text-xs outline-none focus:border-[#5A724A] focus:bg-white"
                                    />
                                </div>

                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                    {menuCategories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap",
                                                selectedCategory === cat
                                                    ? "bg-[#5A724A] text-white"
                                                    : "bg-[#F8F8F8] text-[#818181] hover:text-[#222222]"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Menu Items List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                                    {filteredMenuItems.map(item => (
                                        <div 
                                            key={item._id}
                                            className="p-2.5 bg-white rounded-xl border border-[#EBEBEB] flex items-center justify-between hover:border-[#5A724A] transition-all"
                                        >
                                            <div className="min-w-0 pr-2">
                                                <p className="font-bold text-xs text-[#222222] truncate">{item.name}</p>
                                                <p className="font-mono text-xs text-[#5A724A] font-bold">₹{item.price}</p>
                                            </div>
                                            <button
                                                onClick={() => addToCart(item)}
                                                className="w-7 h-7 bg-[#222222] hover:bg-[#5A724A] text-white rounded-full flex items-center justify-center shrink-0 transition-colors"
                                                title="Add to order"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {/* Current Waiter Cart Tray */}
                                <div className="bg-[#1C2B1A] text-white p-3.5 rounded-2xl space-y-2 mt-2">
                                    <div className="flex items-center justify-between text-xs border-b border-white/20 pb-2">
                                        <div className="flex items-center gap-1.5">
                                            <ShoppingBag size={14} className="text-[#BCE2A3]" />
                                            <span className="font-bold">New Ticket ({waiterCart.length} items)</span>
                                        </div>
                                        <span className="font-mono font-bold text-[#BCE2A3]">Total: ₹{cartTotal.toFixed(2)}</span>
                                    </div>

                                    {waiterCart.length === 0 ? (
                                        <p className="text-[11px] text-white/60 text-center py-2">Select dishes above to add to this ticket.</p>
                                    ) : (
                                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                            {waiterCart.map(item => (
                                                <div key={item._id || item.id} className="flex items-center justify-between text-xs">
                                                    <span className="truncate pr-2">{item.name}</span>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="font-mono text-[#BCE2A3]">₹{item.price * item.quantity}</span>
                                                        <div className="flex items-center gap-1 bg-white/10 rounded-full px-1">
                                                            <button onClick={() => updateCartQty(item._id || item.id, -1)} className="hover:text-[#BCE2A3]">
                                                                <Minus size={11} />
                                                            </button>
                                                            <span className="w-4 text-center font-mono">{item.quantity}</span>
                                                            <button onClick={() => updateCartQty(item._id || item.id, 1)} className="hover:text-[#BCE2A3]">
                                                                <Plus size={11} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSendOrderToKitchen}
                                        disabled={!waiterCart.length || isSubmittingOrder}
                                        variant="primary"
                                        className="w-full py-2.5 text-xs font-bold rounded-xl mt-2 flex items-center justify-center gap-2 bg-[#5A724A] hover:bg-[#485D3B]"
                                    >
                                        {isSubmittingOrder ? (
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={13} /> Send Ticket to Kitchen (Table {selectedTable.tableId})
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
