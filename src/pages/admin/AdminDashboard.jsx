import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { 
    TrendingUp, Users, DollarSign, Activity, AlertTriangle, 
    ArrowUpRight, Flame, CalendarDays, CalendarRange, Calendar, 
    Package, UtensilsCrossed, QrCode, Receipt, Settings, 
    Printer, ShieldCheck, RefreshCw, ShoppingCart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';
import { api, socket } from '../../services/api';

const PERIOD_TABS = [
    { key: 'daily', label: 'Today', icon: CalendarDays },
    { key: 'weekly', label: 'This Week', icon: CalendarRange },
    { key: 'monthly', label: 'This Month', icon: Calendar },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#222222] text-white border border-[#333333] rounded-2xl px-4 py-2.5 shadow-xl">
                <p className="text-[#818181] text-[11px] font-bold mb-0.5">{label}</p>
                <p className="text-[#BCE2A3] font-mono font-bold text-sm">₹{payload[0].value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

export default function AdminDashboard() {
    const [overview, setOverview] = useState({
        todayRevenue: 0,
        monthRevenue: 0,
        todayOrderCount: 0,
        todayPaidCount: 0,
        activeOrderCount: 0,
        occupiedTablesCount: 0,
        billingRequestedCount: 0,
        totalTables: 32,
        lowStockCount: 0,
        activeStaffCount: 4,
        pendingPrintJobs: 0,
        recentLogs: []
    });

    const [salesData, setSalesData] = useState({ daily: null, weekly: null, monthly: null });
    const [activePeriod, setActivePeriod] = useState('daily');
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = async () => {
        try {
            const [overviewRes, salesRes, tablesRes] = await Promise.all([
                api.get('/admin/overview').catch(() => ({ data: {} })),
                api.get('/analytics/sales-overview').catch(() => ({ data: {} })),
                api.get('/tables').catch(() => ({ data: [] }))
            ]);

            setOverview(prev => ({ ...prev, ...(overviewRes.data || {}) }));
            setSalesData(salesRes.data || {});
            setTables(tablesRes.data || []);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load admin dashboard overview:', err);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();

        const handleUpdate = () => fetchAllData();
        socket.on('new_order', handleUpdate);
        socket.on('order_status_update', handleUpdate);
        socket.on('table_update', handleUpdate);

        return () => {
            socket.off('new_order', handleUpdate);
            socket.off('order_status_update', handleUpdate);
            socket.off('table_update', handleUpdate);
        };
    }, []);

    const statCards = [
        { 
            title: "Today's Revenue", 
            value: `₹${(overview.todayRevenue || 0).toLocaleString()}`, 
            subtext: `Month: ₹${(overview.monthRevenue || 0).toLocaleString()}`,
            icon: DollarSign, 
            color: "text-[#5A724A]", 
            bg: "bg-[#BCE2A3]/30" 
        },
        { 
            title: "Active Tables", 
            value: `${overview.occupiedTablesCount || 0} / ${overview.totalTables || 32}`, 
            subtext: `${overview.billingRequestedCount || 0} awaiting bill`,
            icon: Users, 
            color: "text-[#425934]", 
            bg: "bg-[#BCE2A3]/30" 
        },
        { 
            title: "Orders Today", 
            value: `${overview.todayOrderCount || 0}`, 
            subtext: `${overview.activeOrderCount || 0} active tickets`,
            icon: TrendingUp, 
            color: "text-[#5A724A]", 
            bg: "bg-[#BCE2A3]/30" 
        },
        { 
            title: "Thermal Hardware", 
            value: overview.pendingPrintJobs > 0 ? `${overview.pendingPrintJobs} Queued` : "Online Ready", 
            subtext: "Kitchen & POS Connected",
            icon: Printer, 
            color: overview.pendingPrintJobs > 0 ? "text-amber-700" : "text-[#5A724A]", 
            bg: overview.pendingPrintJobs > 0 ? "bg-amber-100" : "bg-[#BCE2A3]/30" 
        },
    ];

    const quickLinks = [
        { label: "Menu & Food CRUD", path: "/admin/menu", icon: UtensilsCrossed, desc: "Add dishes, update prices & availability" },
        { label: "Floor Tables & QR", path: "/admin/tables", icon: QrCode, desc: "32 tables status & QR code generation" },
        { label: "Orders & Live Bills", path: "/admin/orders", icon: ShoppingCart, desc: "Track tickets, bills & discount concessions" },
        { label: "Staff & Permissions", path: "/admin/staff", icon: Users, desc: "Employee logins, roles & access permissions" },
        { label: "Sales & 4-Mo Reports", path: "/admin/analytics", icon: TrendingUp, desc: "Revenue analytics, daily & monthly reports" },
        { label: "Printers & Settings", path: "/admin/settings", icon: Settings, desc: "Thermal printer setup, GST & DB backup" },
    ];

    const currentSales = salesData[activePeriod];

    return (
        <div className="p-2 md:p-4 max-w-[1600px] mx-auto text-[#222222] space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">Executive Dashboard (A02)</h1>
                    <p className="text-[#818181] text-xs mt-1">
                        Restaurant-wide operations, 32-table floor status, financial revenue &amp; hardware monitoring
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchAllData}
                        className="p-2 rounded-full border border-[#EBEBEB] bg-white hover:text-[#5A724A] shadow-xs"
                        title="Refresh live data"
                    >
                        <RefreshCw size={14} className={isLoading ? "animate-spin text-[#5A724A]" : ""} />
                    </button>
                    <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E5E0D8] px-3 py-1.5 rounded-full text-xs font-bold text-[#5A724A]">
                        <div className="w-2 h-2 rounded-full bg-[#5A724A] animate-pulse" />
                        <span>Live Sync Active</span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                    >
                        <Card className="p-5 flex items-center gap-4 bg-white border border-[#EBEBEB] rounded-3xl shadow-xs hover:border-[#5A724A] transition-all">
                            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                                <stat.icon size={26} />
                            </div>
                            <div>
                                <p className="text-[#818181] text-[11px] font-bold uppercase tracking-wider">{stat.title}</p>
                                <h3 className="text-2xl font-mono font-extrabold text-[#222222] mt-0.5 tracking-tight">{stat.value}</h3>
                                <p className="text-[10px] text-[#818181] mt-0.5">{stat.subtext}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Quick Access Control Hub */}
            <div>
                <h2 className="text-base font-extrabold text-[#222222] mb-3">Management Modules</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {quickLinks.map((link, idx) => (
                        <Link
                            key={idx}
                            to={link.path}
                            className="p-4 bg-white rounded-2xl border border-[#EBEBEB] hover:border-[#5A724A] hover:bg-[#BCE2A3]/10 transition-all flex items-center gap-3 group shadow-xs"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#F8F8F8] border border-[#EBEBEB] flex items-center justify-center text-[#5A724A] group-hover:scale-110 transition-transform">
                                <link.icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-xs text-[#222222] group-hover:text-[#5A724A]">{link.label}</h4>
                                    <ArrowUpRight size={13} className="text-[#818181] group-hover:text-[#5A724A]" />
                                </div>
                                <p className="text-[10px] text-[#818181] truncate">{link.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 32 Tables Live Floor Snapshot */}
            <Card className="p-6 bg-white border border-[#EBEBEB] rounded-3xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-[#222222]">32 Tables Floor Matrix</h2>
                        <p className="text-[#818181] text-xs">Real-time occupancy status across valid restaurant tables</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1.5 text-stone-600">
                            <span className="w-2.5 h-2.5 rounded-full bg-stone-300" /> Available ({tables.filter(t => t.status === 'available').length})
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Occupied ({tables.filter(t => t.status === 'occupied').length})
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Billing ({tables.filter(t => t.status === 'billing').length})
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-11 gap-2 pt-2">
                    {tables.map(t => (
                        <Link
                            key={t.tableId}
                            to="/admin/tables"
                            className={clsx(
                                "p-2 rounded-2xl border text-center transition-transform hover:scale-105 shadow-xs",
                                t.status === 'billing' ? "bg-amber-100 border-amber-300 text-amber-950" :
                                t.status === 'occupied' ? "bg-emerald-100 border-emerald-300 text-emerald-950" :
                                "bg-[#F8F8F8] border-[#EBEBEB] text-[#818181]"
                            )}
                        >
                            <span className="block text-xs font-mono font-black">T{t.tableId}</span>
                            <span className="block text-[8px] uppercase font-bold mt-0.5 truncate">{t.status}</span>
                        </Link>
                    ))}
                </div>
            </Card>

            {/* Sales Overview Section */}
            <Card className="p-6 bg-white border border-[#EBEBEB] rounded-3xl shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-[#222222]">Sales Overview (A16)</h2>
                        <p className="text-[#818181] text-xs">Revenue metrics by timeframe</p>
                    </div>
                    <div className="flex gap-1 bg-[#F8F8F8] p-1 rounded-full border border-[#EBEBEB] self-start sm:self-auto">
                        {PERIOD_TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActivePeriod(tab.key)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                                    activePeriod === tab.key
                                        ? "bg-[#5A724A] text-white shadow-xs"
                                        : "text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                <tab.icon size={13} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sales Stats Mini Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8]">
                        <p className="text-[11px] text-[#818181] uppercase tracking-wider font-bold mb-1">
                            {activePeriod === 'daily' ? "Today's" : activePeriod === 'weekly' ? "This Week's" : "This Month's"} Revenue
                        </p>
                        <h3 className="text-2xl font-mono font-extrabold text-[#5A724A]">
                            ₹{(currentSales?.total || overview.todayRevenue || 0).toLocaleString()}
                        </h3>
                    </div>
                    <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#E5E0D8]">
                        <p className="text-[11px] text-[#818181] uppercase tracking-wider font-bold mb-1">
                            {activePeriod === 'daily' ? "Today's" : activePeriod === 'weekly' ? "This Week's" : "This Month's"} Orders
                        </p>
                        <h3 className="text-2xl font-mono font-extrabold text-[#222222]">
                            {currentSales?.orders || overview.todayOrderCount || 0}
                        </h3>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[280px] w-full">
                    {currentSales?.chart && currentSales.chart.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentSales.chart} barSize={26}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#818181', fontSize: 11 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#818181', fontSize: 11 }}
                                    tickFormatter={(v) => `₹${v}`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(90,114,74,0.06)' }} />
                                <Bar dataKey="sales" fill="#5A724A" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[#818181]">
                            <DollarSign size={36} className="opacity-30 mb-2" />
                            <p className="text-xs font-semibold">No sales logged for this timeframe.</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Bottom Row: Recent Audit Activity & Low Stock */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Log (A20) */}
                <Card className="p-6 bg-white border border-[#EBEBEB] rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-[#222222] flex items-center gap-2">
                            <ShieldCheck size={18} className="text-[#5A724A]" /> Recent Employee Activity (A20)
                        </h3>
                        <Link to="/admin/settings" className="text-xs text-[#5A724A] font-bold hover:underline">
                            View All Logs
                        </Link>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {(overview.recentLogs || []).length === 0 ? (
                            <p className="text-xs text-[#818181] py-4 text-center">No recent activity logs recorded.</p>
                        ) : (
                            overview.recentLogs.map((log, i) => (
                                <div key={i} className="p-2.5 bg-[#F8F8F8] rounded-xl border border-[#EBEBEB] text-xs flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-[#222222]">{log.action}</p>
                                        <p className="text-[10px] text-[#818181]">{log.userName || 'Staff'} • {log.role || 'Staff'}</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-[#818181]">
                                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Restaurant Floor Plan Summary (A08) */}
                <Card className="p-6 bg-white border border-[#EBEBEB] rounded-3xl shadow-xs flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-extrabold text-sm text-[#222222] flex items-center gap-2">
                            <QrCode size={18} className="text-[#5A724A]" /> Floor Tables (32 Valid Tables)
                        </h3>
                        <Link to="/admin/tables" className="text-xs text-[#5A724A] font-bold hover:underline">
                            Manage Tables
                        </Link>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 bg-[#F8F8F8] rounded-2xl border border-[#EBEBEB] text-center">
                            <p className="text-[10px] uppercase font-bold text-[#818181]">Available</p>
                            <p className="text-lg font-black text-[#5A724A] mt-0.5">
                                {tables.filter(t => t.tableId !== 13 && (!t.status || t.status === 'available')).length}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-center">
                            <p className="text-[10px] uppercase font-bold text-amber-800">Occupied</p>
                            <p className="text-lg font-black text-amber-700 mt-0.5">
                                {tables.filter(t => t.status === 'occupied').length}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-center">
                            <p className="text-[10px] uppercase font-bold text-purple-800">Billing</p>
                            <p className="text-lg font-black text-purple-700 mt-0.5">
                                {tables.filter(t => t.status === 'billing').length}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center bg-[#F4F6F0] p-3.5 rounded-2xl border border-[#EBEBEB]">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-[#222222]">Valid Floor Capacity</span>
                            <span className="font-mono text-[#5A724A] font-extrabold">32 Tables (Table 13 Omitted)</span>
                        </div>
                        <p className="text-[10px] text-[#818181] mt-1">
                            Tables 1 to 33 configured with table-specific QR codes and instant cashier settlement release.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}
