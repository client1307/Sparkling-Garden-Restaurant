import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Clock, ChefHat, User, Sparkles, Bell, Receipt, Download, FileText, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { socket, api } from '../../services/api';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatIndiaDateTime } from '../../utils/dateUtils';

const STEPS = [
    { status: 'Pending', label: 'Order Received', icon: Clock },
    { status: 'Preparing', label: 'Kitchen Preparing', icon: ChefHat },
    { status: 'Ready', label: 'Ready to Serve', icon: CheckCircle },
    { status: 'Served', label: 'Enjoy your meal!', icon: User },
];

const OrderStatus = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [status, setStatus] = useState('Pending');
    const [billData, setBillData] = useState(null);
    const [isLoadingBill, setIsLoadingBill] = useState(true);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

    // Fetch Active Table Bill & Orders
    const fetchTableBill = async () => {
        try {
            const res = await api.get(`/orders/table/${tableId}/active`);
            if (res.data && res.data.hasActiveOrder) {
                setBillData(res.data);
                setStatus(res.data.latestStatus || 'Pending');
            }
        } catch (err) {
            console.error('Failed to load table bill:', err);
        } finally {
            setIsLoadingBill(false);
        }
    };

    useEffect(() => {
        fetchTableBill();

        const tableNumber = parseInt(tableId, 10);
        
        socket.on('order_status_update', (updatedOrder) => {
            if (Number(updatedOrder.tableNumber) === tableNumber) {
                setStatus(updatedOrder.status);
                fetchTableBill();

                const messages = {
                    'Preparing': { text: '👨‍🍳 Your dishes are currently on the fire!', icon: '🔥' },
                    'Ready': { text: '✅ Your order is ready to serve!', icon: '🎉' },
                    'Served': { text: '🍽️ Enjoy your artisan meal!', icon: '✨' },
                    'Paid': { text: '💳 Payment confirmed. Thank you!', icon: '🙏' },
                };
                const msg = messages[updatedOrder.status];
                if (msg) {
                    toast(msg.text, {
                        icon: msg.icon,
                        duration: 4000,
                    });
                }
            }
        });

        return () => {
            socket.off('order_status_update');
        };
    }, [tableId]);

    const handleDownloadReceipt = async () => {
        setIsDownloadingPdf(true);
        try {
            const response = await api.get(`/reports/bill/table/${tableId}`, { responseType: 'blob' });
            const urlObj = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = urlObj;
            link.setAttribute('download', `sparkling-table-${tableId}-bill.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(urlObj);
            toast.success("Receipt downloaded successfully!");
        } catch (error) {
            console.error("Failed to download bill:", error);
            toast.error("Could not download receipt. Please ask server.");
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const currentStepIndex = Math.max(0, STEPS.findIndex(s => s.status === status));

    return (
        <div className="pt-2 pb-20 flex flex-col items-center min-h-[90vh] max-w-md mx-auto relative text-[#222222]">
            {/* Header */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 bg-[#BCE2A3]/30 border border-[#BCE2A3] px-3.5 py-1 rounded-full text-xs font-bold text-[#425934] mb-2.5">
                    <span className="w-2 h-2 rounded-full bg-[#5A724A] animate-pulse" />
                    <span>Table {tableId || '??'} Live Session</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">Order &amp; Bill Status</h1>
                <p className="text-xs text-[#818181] mt-0.5">Real-time status synced with kitchen</p>
            </div>

            {/* Stepper Card */}
            <div className="w-full bg-white border border-[#EBEBEB] p-5 sm:p-6 rounded-3xl shadow-[0_8px_30px_rgba(90,114,74,0.06)] relative overflow-hidden mb-6">
                <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-[#EBEBEB] z-0" />

                <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(currentStepIndex / (STEPS.length - 1)) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="absolute left-10 top-10 bottom-10 w-0.5 bg-[#5A724A] z-0 shadow-xs"
                />

                <div className="space-y-6 relative z-10">
                    {STEPS.map((step, index) => {
                        const isCompleted = index <= currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        const Icon = step.icon;

                        return (
                            <div key={step.status} className="relative flex items-center gap-4">
                                <motion.div
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: isCurrent ? 1.08 : 1 }}
                                    className={clsx(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10 shadow-xs shrink-0",
                                        isCompleted
                                            ? (isCurrent ? 'bg-[#5A724A] border-[#5A724A] text-white shadow-[0_4px_14px_rgba(90,114,74,0.35)]' : 'border-[#5A724A] text-[#5A724A] bg-[#BCE2A3]/30')
                                            : 'border-[#EBEBEB] text-[#818181] bg-[#F8F8F8]'
                                    )}
                                >
                                    {isCurrent && (
                                        <span className="absolute inset-0 rounded-full border-2 border-[#5A724A] animate-ping opacity-35" />
                                    )}
                                    <Icon size={17} />
                                </motion.div>

                                <div className={clsx(
                                    "text-left flex-1 px-4 py-2.5 rounded-2xl border transition-all",
                                    isCurrent ? "bg-[#F4F6F0] border-[#BCE2A3]" : "bg-[#F8F8F8] border-[#EBEBEB]"
                                )}>
                                    <h3 className={clsx(
                                        "font-bold text-sm",
                                        isCurrent ? 'text-[#5A724A]' : isCompleted ? 'text-[#222222]' : 'text-[#818181]'
                                    )}>
                                        {step.label}
                                    </h3>
                                    {isCurrent && <p className="text-[#818181] text-[11px] mt-0.5 font-medium">Estimated ~8-12 min</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* LIVE BILL & ORDER SUMMARY CARD */}
            <div className="w-full bg-white border border-[#EBEBEB] rounded-3xl shadow-[0_8px_30px_rgba(90,114,74,0.06)] overflow-hidden mb-6">
                {/* Bill Header */}
                <div className="p-4 sm:p-5 bg-[#F8F8F8] border-b border-[#EBEBEB] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#5A724A] text-white flex items-center justify-center">
                            <Receipt size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-[#222222]">Your Live Bill &amp; Order</h2>
                            <p className="text-[10px] text-[#818181]">Table {tableId} · {billData?.orderCount || 1} Batch</p>
                        </div>
                    </div>
                    <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        status === 'Paid'
                            ? "bg-[#BCE2A3]/30 text-[#425934] border-[#BCE2A3]"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                        {status === 'Paid' ? 'Paid' : 'Unpaid · Pay Later'}
                    </span>
                </div>

                {/* Items List */}
                <div className="p-4 sm:p-5">
                    {billData && billData.items && billData.items.length > 0 ? (
                        <div className="space-y-2.5 mb-4">
                            {billData.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#F4F6F0]">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 font-mono font-bold text-[#5A724A]">{item.quantity}x</span>
                                        <span className="font-semibold text-[#222222]">{item.name}</span>
                                    </div>
                                    <span className="font-mono font-bold text-[#222222]">₹{item.total || (item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-xs text-[#818181]">
                            Loading active items...
                        </div>
                    )}

                    {/* Financial Breakdown */}
                    <div className="space-y-1.5 pt-2 text-xs border-t border-[#EBEBEB]">
                        <div className="flex justify-between text-[#818181]">
                            <span>Subtotal</span>
                            <span className="font-mono text-[#222222] font-semibold">₹{(billData?.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#818181]">
                            <span>GST (5%)</span>
                            <span className="font-mono text-[#222222] font-semibold">₹{(billData?.tax || 0).toFixed(2)}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-[#EBEBEB] flex justify-between items-center">
                            <span className="font-extrabold text-sm text-[#222222]">Total Bill Amount</span>
                            <span className="text-xl font-mono font-black text-[#5A724A]">₹{(billData?.totalAmount || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Download PDF Receipt Button */}
                    <div className="mt-4 pt-3 border-t border-[#F0F0F0]">
                        <button
                            onClick={handleDownloadReceipt}
                            disabled={isDownloadingPdf}
                            className="w-full bg-[#F4F6F0] hover:bg-[#EAEFE4] text-[#5A724A] border border-[#BCE2A3] rounded-2xl py-2.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs disabled:opacity-50"
                        >
                            {isDownloadingPdf ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#5A724A] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Download size={14} />
                            )}
                            <span>Download Official Bill / Tax Invoice (PDF)</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Meal Rating Card if Served */}
            <AnimatePresence>
                {status === 'Served' && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 w-full"
                    >
                        <div className="bg-white border border-[#EBEBEB] p-5 rounded-3xl shadow-xs text-center">
                            <Sparkles size={22} className="text-[#5A724A] mx-auto mb-2" />
                            <p className="text-xs font-bold text-[#222222] mb-3">How did you enjoy your dishes?</p>
                            <div className="flex gap-2 justify-center bg-[#F8F8F8] p-2.5 rounded-full border border-[#EBEBEB] max-w-xs mx-auto">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => toast.success(`Thank you for giving ${star} stars!`)}
                                        className="text-xl hover:scale-125 transition-transform"
                                    >
                                        ⭐
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex w-full gap-3">
                <Button 
                    variant="outline" 
                    className="flex-1 rounded-full py-3.5 text-xs font-bold"
                    onClick={() => {
                        socket.emit('call_waiter', { tableId });
                        toast.success('Staff notified! A server will be right with you.', { icon: '🔔' });
                    }}
                >
                    <Bell size={15} />
                    Call Waiter
                </Button>
                <Button 
                    variant="primary"
                    onClick={() => navigate(`/table/${tableId}/menu`)} 
                    className="flex-1 rounded-full py-3.5 text-xs font-bold"
                >
                    Order More Dishes
                </Button>
            </div>
        </div>
    );
};

export default OrderStatus;
