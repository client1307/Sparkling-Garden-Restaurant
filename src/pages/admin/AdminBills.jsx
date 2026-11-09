import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Receipt, ShoppingCart, Percent, Search, Calendar, 
    CheckCircle2, Clock, Eye, Download, Filter, IndianRupee, 
    RefreshCw, AlertCircle, ShieldAlert, ArrowUpRight, User, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api, socket } from '../../services/api';

export default function AdminBills() {
    const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'bills' | 'discounts'
    const [orders, setOrders] = useState([]);
    const [bills, setBills] = useState([]);
    const [discountData, setDiscountData] = useState({ totalDiscountGiven: 0, count: 0, records: [], auditTrail: [] });
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

    // Detail Modal
    const [selectedRecord, setSelectedRecord] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [ordersRes, billsRes, discountsRes] = await Promise.all([
                api.get('/orders'),
                api.get('/admin/bills', { params: { date: selectedDate } }).catch(() => ({ data: [] })),
                api.get('/admin/discounts').catch(() => ({ data: { totalDiscountGiven: 0, count: 0, records: [] } }))
            ]);

            setOrders(ordersRes.data || []);
            setBills(billsRes.data || []);
            setDiscountData(discountsRes.data || {});
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load billing monitoring data:', err);
            toast.error('Failed to load orders & bills');
            setIsLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadData();

        const handleRealtime = () => loadData();
        socket.on('new_order', handleRealtime);
        socket.on('order_status_update', handleRealtime);
        socket.on('table_update', handleRealtime);

        return () => {
            socket.off('new_order', handleRealtime);
            socket.off('order_status_update', handleRealtime);
            socket.off('table_update', handleRealtime);
        };
    }, [loadData]);

    // Filtered Orders
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
            const matchesSearch = !searchQuery.trim() || 
                o.tableId?.toString().includes(searchQuery) ||
                o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o.waiterName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                o._id?.includes(searchQuery);
            return matchesStatus && matchesSearch;
        });
    }, [orders, statusFilter, searchQuery]);

    // Filtered Bills
    const filteredBills = useMemo(() => {
        return bills.filter(b => {
            const matchesSearch = !searchQuery.trim() || 
                b.tableId?.toString().includes(searchQuery) ||
                b.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [bills, searchQuery]);

    // Filtered Discounts
    const filteredDiscounts = useMemo(() => {
        return (discountData.records || []).filter(d => {
            const matchesSearch = !searchQuery.trim() || 
                d.tableId?.toString().includes(searchQuery) ||
                d.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [discountData, searchQuery]);

    return (
        <div className="text-[#222222] max-w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">Orders, Bills &amp; Discounts</h1>
                    <p className="text-[#818181] text-xs mt-1">
                        Live kitchen tickets, cashier-settled customer tax bills, and manager-authorized discount logs
                    </p>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-[#EBEBEB] shadow-xs">
                    <Calendar size={14} className="text-[#5A724A]" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-xs font-bold text-[#222222] outline-none"
                    />
                </div>
            </div>

            {/* Navigation Tabs (A13, A14, A15) */}
            <div className="flex items-center gap-2 border-b border-[#EBEBEB] pb-3">
                <button
                    onClick={() => setActiveTab('orders')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all",
                        activeTab === 'orders' 
                            ? "bg-[#5A724A] text-white shadow-xs" 
                            : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <ShoppingCart size={14} />
                    Active Orders ({orders.length})
                </button>
                <button
                    onClick={() => setActiveTab('bills')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all",
                        activeTab === 'bills' 
                            ? "bg-[#5A724A] text-white shadow-xs" 
                            : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <Receipt size={14} />
                    All Bills ({bills.length})
                </button>
                <button
                    onClick={() => setActiveTab('discounts')}
                    className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all",
                        activeTab === 'discounts' 
                            ? "bg-[#5A724A] text-white shadow-xs" 
                            : "bg-white text-[#818181] border border-[#EBEBEB] hover:text-[#222222]"
                    )}
                >
                    <Percent size={14} />
                    Discounts Issued ({discountData.count || 0})
                </button>
            </div>

            {/* Quick Summary Pill for Discounts if on discounts tab */}
            {activeTab === 'discounts' && (
                <div className="p-4 bg-amber-50 rounded-3xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-200/60 text-amber-900 flex items-center justify-center font-bold">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h4 className="font-extrabold text-sm text-amber-950">Manager Discount Authorization Summary</h4>
                            <p className="text-[11px] text-amber-800">Total revenue waived under authorized promotional discounts</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Total Waived</span>
                        <span className="text-xl font-mono font-black text-amber-950">₹{(discountData.totalDiscountGiven || 0).toFixed(2)}</span>
                    </div>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#818181]" size={16} />
                    <input
                        type="text"
                        placeholder="Search by table #, customer name, waiter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-xs border border-[#EBEBEB] rounded-full bg-[#F8F8F8] focus:bg-white focus:border-[#5A724A] outline-none"
                    />
                </div>

                {activeTab === 'orders' && (
                    <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-full border border-[#EBEBEB] overflow-x-auto">
                        {['all', 'Pending', 'Preparing', 'Ready', 'Served', 'Paid'].map(status => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-bold capitalize transition-all whitespace-nowrap",
                                    statusFilter === status ? "bg-[#5A724A] text-white" : "text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* TAB CONTENT 1: ORDERS (A13) */}
            {activeTab === 'orders' && (
                <div className="space-y-3">
                    {filteredOrders.length === 0 ? (
                        <div className="p-16 text-center text-[#818181] bg-white rounded-3xl border border-[#EBEBEB]">
                            <AlertCircle className="mx-auto mb-2 text-amber-600" size={32} />
                            <p className="text-sm font-bold text-[#222222]">No orders match the criteria</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredOrders.map(order => (
                                <div key={order._id} className="bg-white rounded-3xl border border-[#EBEBEB] p-4 shadow-xs hover:border-[#5A724A] transition-all flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-xl bg-[#5A724A]/10 text-[#5A724A] font-extrabold text-xs flex items-center justify-center">
                                                    T{order.tableId}
                                                </span>
                                                <div>
                                                    <h4 className="font-extrabold text-xs text-[#222222]">{order.customerName || 'Walk-in Guest'}</h4>
                                                    <span className="text-[10px] text-[#818181] font-mono">
                                                        {new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className={clsx(
                                                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                order.status === 'Paid' ? "bg-emerald-100 text-emerald-800" :
                                                order.status === 'Served' ? "bg-blue-100 text-blue-800" :
                                                order.status === 'Ready' ? "bg-purple-100 text-purple-800" :
                                                order.status === 'Preparing' ? "bg-amber-100 text-amber-800" :
                                                "bg-stone-100 text-stone-800"
                                            )}>
                                                {order.status}
                                            </span>
                                        </div>

                                        {/* Items */}
                                        <div className="space-y-1 pt-2">
                                            {(order.items || []).map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center text-xs">
                                                    <span className="text-[#222222] truncate max-w-[180px]">
                                                        {item.quantity}x {item.name || item.menuItemId?.name}
                                                    </span>
                                                    <span className="font-mono text-[#818181]">
                                                        ₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-2 border-t border-[#F4F6F0] flex items-center justify-between">
                                        <div className="text-[11px] text-[#818181]">
                                            Waiter: <span className="font-bold text-[#222222]">{order.waiterName || 'Staff'}</span>
                                        </div>
                                        <div className="font-mono font-bold text-sm text-[#5A724A]">
                                            ₹{(order.total || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT 2: BILLS (A14) */}
            {activeTab === 'bills' && (
                <div className="bg-white rounded-3xl border border-[#EBEBEB] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[10px] uppercase font-bold text-[#818181]">
                                <tr>
                                    <th className="py-3 px-4">Invoice #</th>
                                    <th className="py-3 px-4">Table</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Subtotal</th>
                                    <th className="py-3 px-4">Discount</th>
                                    <th className="py-3 px-4">Net Total</th>
                                    <th className="py-3 px-4">Payment</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Settled At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F6F0]">
                                {filteredBills.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="py-8 text-center text-[#818181]">
                                            No bills recorded for this date.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBills.map(bill => (
                                        <tr key={bill._id} className="hover:bg-[#FAF8F5] transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-[#5A724A]">
                                                #{bill._id.slice(-6).toUpperCase()}
                                            </td>
                                            <td className="py-3 px-4 font-bold">Table {bill.tableId}</td>
                                            <td className="py-3 px-4">
                                                <span className="font-bold text-[#222222] block">{bill.customerName || 'Walk-in'}</span>
                                                <span className="text-[10px] text-[#818181] font-mono">{bill.customerMobile || '—'}</span>
                                            </td>
                                            <td className="py-3 px-4 font-mono">₹{(bill.subtotal || bill.total || 0).toFixed(2)}</td>
                                            <td className="py-3 px-4 font-mono text-amber-700">
                                                {bill.discountAmount > 0 ? `-₹${bill.discountAmount.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-black text-sm text-[#222222]">
                                                ₹{(bill.total || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 capitalize font-semibold">{bill.paymentMethod || 'Cash'}</td>
                                            <td className="py-3 px-4">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                    bill.status === 'Paid' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                )}>
                                                    {bill.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-[#818181]">
                                                {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT 3: DISCOUNTS (A15) */}
            {activeTab === 'discounts' && (
                <div className="bg-white rounded-3xl border border-[#EBEBEB] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#FAF8F5] border-b border-[#E5E0D8] text-[10px] uppercase font-bold text-[#818181]">
                                <tr>
                                    <th className="py-3 px-4">Order / Bill #</th>
                                    <th className="py-3 px-4">Table</th>
                                    <th className="py-3 px-4">Customer</th>
                                    <th className="py-3 px-4">Original Total</th>
                                    <th className="py-3 px-4">Discount Waived</th>
                                    <th className="py-3 px-4">Final Paid</th>
                                    <th className="py-3 px-4">Authorized By</th>
                                    <th className="py-3 px-4 text-right">Date &amp; Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F6F0]">
                                {filteredDiscounts.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-8 text-center text-[#818181]">
                                            No discount concessions granted.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDiscounts.map(d => (
                                        <tr key={d._id} className="hover:bg-amber-50/20 transition-colors">
                                            <td className="py-3 px-4 font-mono font-bold text-[#5A724A]">
                                                #{d._id.slice(-6).toUpperCase()}
                                            </td>
                                            <td className="py-3 px-4 font-bold">Table {d.tableId}</td>
                                            <td className="py-3 px-4">{d.customerName || 'Walk-in Guest'}</td>
                                            <td className="py-3 px-4 font-mono">
                                                ₹{((d.total || 0) + (d.discountAmount || 0)).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-amber-700 bg-amber-50/50">
                                                -₹{(d.discountAmount || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-black text-[#222222]">
                                                ₹{(d.total || 0).toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                                                    Manager PIN Verified
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-[#818181]">
                                                {new Date(d.createdAt).toLocaleString('en-IN', { 
                                                    dateStyle: 'short', 
                                                    timeStyle: 'short' 
                                                })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

