import { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { 
    ChefHat, Clock, CheckCircle, Search, Filter, 
    RefreshCw, Utensils, User, Phone, AlertCircle, 
    Minus, Plus, Trash2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getKitchenOrders, editOrderItem, api, socket } from '../../services/api';
import toast from 'react-hot-toast';

export default function WaiterOrders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // All, Ready, Preparing, Pending, Served

    const fetchOrders = async () => {
        try {
            const data = await getKitchenOrders();
            // Sort by newest first
            setOrders(data || []);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to fetch waiter orders:', error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();

        socket.on('new_order', () => fetchOrders());
        socket.on('order_status_update', () => fetchOrders());
        socket.on('table_update', () => fetchOrders());

        return () => {
            socket.off('new_order');
            socket.off('order_status_update');
            socket.off('table_update');
        };
    }, []);

    // Filtered Orders
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || 
                String(order.tableNumber).includes(q) ||
                (order.customerName && order.customerName.toLowerCase().includes(q)) ||
                (order.customerMobile && order.customerMobile.includes(q)) ||
                (order.items && order.items.some(i => i.name.toLowerCase().includes(q)));
            return matchesStatus && matchesSearch;
        });
    }, [orders, statusFilter, searchQuery]);

    // Mark as Served (W12)
    const handleMarkServed = async (orderId) => {
        try {
            await api.put(`/orders/${orderId}/status`, { status: 'Served' });
            toast.success("Dish marked as Served to guests! 🍽️", { icon: '✨' });
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update order status");
        }
    };

    // Item quantity adjustment or cancellation (W08, W09, W13)
    const handleItemQuantity = async (orderId, itemIdx, currentQty, delta, itemName = 'Item') => {
        const newQty = currentQty + delta;
        if (newQty < 0) return;

        if (newQty === 0 && !window.confirm(`Cancel ${currentQty}x "${itemName}" from kitchen? A CANCELLED ticket will be sent to the kitchen printer.`)) {
            return;
        }

        try {
            await editOrderItem(orderId, itemIdx, newQty);
            if (newQty === 0) {
                toast.success(`Cancelled ${currentQty}x ${itemName} → Kitchen cancellation ticket queued!`);
            } else if (newQty < currentQty) {
                const diff = currentQty - newQty;
                toast.success(`Reduced to ${newQty}x ${itemName} (${diff}x cancelled) → Sent to kitchen!`);
            } else {
                const diff = newQty - currentQty;
                toast.success(`Increased to ${newQty}x ${itemName} (+${diff}x add-on) → Sent to kitchen!`);
            }
            fetchOrders();
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
        await handleItemQuantity(orderId, itemIdx, currentQty, delta, itemName);
    };

    const readyCount = orders.filter(o => o.status === 'Ready').length;
    const preparingCount = orders.filter(o => o.status === 'Preparing').length;
    const pendingCount = orders.filter(o => o.status === 'Pending').length;

    return (
        <div className="text-[#222222] max-w-full pb-12">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">Active Floor Orders</h1>
                    <p className="text-[#818181] text-xs mt-0.5">
                        Track live preparation in the kitchen, serve ready dishes, and adjust quantities on demand.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { fetchOrders(); toast.success('Orders refreshed'); }}
                        className="bg-white hover:bg-[#F8F8F8] text-[#222222] border border-[#EBEBEB] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* Quick Filter Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <button
                    onClick={() => setStatusFilter('All')}
                    className={clsx(
                        "p-4 rounded-3xl border text-left transition-all shadow-xs",
                        statusFilter === 'All' ? "bg-[#222222] text-white border-[#222222]" : "bg-white text-[#222222] border-[#EBEBEB]"
                    )}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Active</span>
                    <span className="text-2xl font-mono font-extrabold">{orders.length}</span>
                </button>

                <button
                    onClick={() => setStatusFilter('Ready')}
                    className={clsx(
                        "p-4 rounded-3xl border text-left transition-all shadow-xs",
                        statusFilter === 'Ready' 
                            ? "bg-emerald-700 text-white border-emerald-700 ring-2 ring-emerald-300" 
                            : readyCount > 0 ? "bg-emerald-50 text-emerald-900 border-emerald-300 animate-pulse" : "bg-white text-[#222222] border-[#EBEBEB]"
                    )}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Ready to Serve</span>
                    <span className="text-2xl font-mono font-extrabold">{readyCount}</span>
                </button>

                <button
                    onClick={() => setStatusFilter('Preparing')}
                    className={clsx(
                        "p-4 rounded-3xl border text-left transition-all shadow-xs",
                        statusFilter === 'Preparing' ? "bg-orange-600 text-white border-orange-600" : "bg-white text-[#222222] border-[#EBEBEB]"
                    )}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Kitchen Preparing</span>
                    <span className="text-2xl font-mono font-extrabold">{preparingCount}</span>
                </button>

                <button
                    onClick={() => setStatusFilter('Pending')}
                    className={clsx(
                        "p-4 rounded-3xl border text-left transition-all shadow-xs",
                        statusFilter === 'Pending' ? "bg-amber-600 text-white border-amber-600" : "bg-white text-[#222222] border-[#EBEBEB]"
                    )}
                >
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Pending Kitchen</span>
                    <span className="text-2xl font-mono font-extrabold">{pendingCount}</span>
                </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-6">
                <Search size={16} className="absolute left-4 top-3.5 text-[#818181]" />
                <input
                    type="text"
                    placeholder="Search by table number (e.g. 1), customer name, or dish name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#EBEBEB] bg-white text-sm outline-none focus:border-[#5A724A] shadow-xs"
                />
            </div>

            {/* Orders Feed */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="w-8 h-8 border-3 border-[#5A724A] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#EBEBEB]">
                    <ChefHat size={36} className="text-[#818181] mx-auto mb-2 opacity-50" />
                    <h3 className="font-bold text-sm text-[#222222]">No orders found</h3>
                    <p className="text-xs text-[#818181] mt-0.5">There are no active orders matching your filter.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredOrders.map(order => {
                            const isReady = order.status === 'Ready';
                            const isServed = order.status === 'Served';
                            const isPreparing = order.status === 'Preparing';

                            return (
                                <motion.div
                                    key={order._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={clsx(
                                        "bg-white rounded-3xl border-2 p-5 shadow-xs flex flex-col justify-between transition-all",
                                        isReady 
                                            ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-300" 
                                            : isPreparing 
                                                ? "border-orange-300 bg-orange-50/10" 
                                                : "border-[#EBEBEB]"
                                    )}
                                >
                                    <div>
                                        {/* Card Top: Table, Add-On tag, Status */}
                                        <div className="flex items-start justify-between border-b border-[#F4F6F0] pb-3 mb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-black font-mono text-[#222222]">
                                                        Table {order.tableNumber}
                                                    </span>
                                                    {order.isAddOn && (
                                                        <span className="bg-[#5A724A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                            Add-On
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-[#818181] mt-0.5">
                                                    <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {order.waiterName && (
                                                        <span>• Placed by {order.waiterName}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-2xs",
                                                isReady ? "bg-emerald-600 text-white animate-pulse" :
                                                isServed ? "bg-gray-100 text-gray-700" :
                                                isPreparing ? "bg-orange-100 text-orange-800" :
                                                "bg-amber-100 text-amber-800"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>

                                        {/* Customer Info (W05) */}
                                        {(order.customerName || order.customerMobile) && (
                                            <div className="flex items-center gap-2 text-xs bg-[#F8F8F8] px-3 py-1.5 rounded-xl mb-3 text-[#818181]">
                                                <User size={12} className="text-[#5A724A]" />
                                                <span className="font-semibold text-[#222222]">{order.customerName || 'Guest'}</span>
                                                {order.customerMobile && (
                                                    <span className="font-mono text-[11px]">({order.customerMobile})</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Items list with quantity editing (W08, W09, W13) */}
                                        <div className="space-y-2 mb-4">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[#F8F8F8]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={clsx(
                                                            "font-semibold",
                                                            item.status === 'cancelled' ? "line-through text-red-500" : "text-[#222222]"
                                                        )}>
                                                            {item.name}
                                                        </span>
                                                        {item.status === 'cancelled' && (
                                                            <span className="text-[8px] bg-red-100 text-red-700 px-1 py-0.2 rounded font-bold">CANCELLED</span>
                                                        )}
                                                    </div>

                                                    {item.status !== 'cancelled' ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-[#5A724A] font-bold">₹{item.price * item.quantity}</span>
                                                            <div className="flex items-center gap-1 bg-[#F4F6F0] rounded-full px-1.5 py-0.5 border border-[#EBEBEB]">
                                                                <button
                                                                    onClick={() => handleItemQuantity(order._id, idx, item.quantity, -1, item.name)}
                                                                    className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#5A724A] hover:bg-rose-500 hover:text-white transition-colors shadow-2xs"
                                                                    title="Decrease quantity (reduces & sends cancellation to kitchen)"
                                                                >
                                                                    <Minus size={10} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handlePromptDirectQty(order._id, idx, item.quantity, item.name)}
                                                                    className="font-mono font-bold w-6 text-center text-xs hover:bg-[#BCE2A3]/40 rounded transition-colors"
                                                                    title="Click to enter exact quantity or cancel item"
                                                                >
                                                                    {item.quantity}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleItemQuantity(order._id, idx, item.quantity, 1, item.name)}
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

                                    {/* Card Footer: Total & Actions */}
                                    <div className="pt-3 border-t border-[#F4F6F0]">
                                        <div className="flex items-center justify-between mb-3 text-xs">
                                            <span className="text-[#818181] uppercase font-bold text-[10px]">Batch Total</span>
                                            <span className="text-base font-mono font-black text-[#5A724A]">₹{order.totalAmount}</span>
                                        </div>

                                        {isReady ? (
                                            <button
                                                onClick={() => handleMarkServed(order._id)}
                                                className="w-full py-2.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                                            >
                                                <CheckCircle size={14} /> Mark as Served to Table
                                            </button>
                                        ) : isServed ? (
                                            <div className="w-full py-2 rounded-full text-xs font-bold text-[#5A724A] bg-[#BCE2A3]/30 text-center">
                                                ✓ Delivered &amp; Served
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-1.5 text-xs text-[#818181] py-1.5 font-medium">
                                                <Clock size={13} className="animate-spin text-orange-500" /> Kitchen preparing dishes (~{order.estimatedPrepTime || 15} min)
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
