import { Outlet, useParams, Link, useSearchParams, useLocation } from 'react-router-dom';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { useCart } from '../context/CartContext';
import { ShoppingBag, Receipt, Utensils } from 'lucide-react';

export default function CustomerLayout() {
    const { tableId } = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const tableToken = searchParams.get('tableToken');
    if (tableToken) localStorage.setItem('tableToken', tableToken);
    const { totalItems, total } = useCart();
    const isStatusPage = location.pathname.includes('/status');

    return (
        <div className="min-h-screen bg-[#F4F6F0] text-[#222222] pb-24 selection:bg-[#BCE2A3] selection:text-[#222222]">
            <OfflineBanner />
            
            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 border-b border-[#EBEBEB] bg-white/95 backdrop-blur-md px-4 sm:px-5 py-3.5 flex justify-between items-center transition-all shadow-xs">
                <a href="/" className="flex items-center gap-2.5 group">
                    <img 
                        src="/images/sparkling-logo-dark.png" 
                        alt="The Sparkling Garden Restaurant" 
                        className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105" 
                    />
                    <div className="border-l border-[#EBEBEB] pl-2 hidden sm:block">
                        <span className="text-[10px] uppercase tracking-wider text-[#5A724A] font-extrabold block">Garden Restaurant</span>
                        <span className="text-[9px] text-[#818181] font-medium block">Digital Guest Menu</span>
                    </div>
                </a>

                <div className="flex items-center gap-2">
                    {/* Live Header Cart Button (if items present) */}
                    {totalItems > 0 && !location.pathname.includes('/cart') && (
                        <Link 
                            to={`/table/${tableId}/cart`}
                            className="flex items-center gap-1.5 bg-[#5A724A] hover:bg-[#485D3B] text-white px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-[0_4px_12px_rgba(90,114,74,0.25)]"
                        >
                            <ShoppingBag size={14} />
                            <span>{totalItems}</span>
                            <span className="font-mono text-[#BCE2A3] border-l border-white/20 pl-1.5">₹{total.toFixed(0)}</span>
                        </Link>
                    )}

                    {/* Quick navigation toggle between Menu and Bill/Status */}
                    {isStatusPage ? (
                        <Link
                            to={`/table/${tableId}/menu`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-[#EBEBEB] text-[#5A724A] hover:border-[#5A724A] text-xs font-bold transition-all shadow-2xs"
                        >
                            <Utensils size={13} />
                            <span className="text-[11px]">Menu</span>
                        </Link>
                    ) : (
                        <Link
                            to={`/table/${tableId}/status`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-[#EBEBEB] text-[#5A724A] hover:border-[#5A724A] text-xs font-bold transition-all shadow-2xs"
                            title="View Live Bill & Order Status"
                        >
                            <Receipt size={13} />
                            <span className="text-[11px]">Bill</span>
                        </Link>
                    )}

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BCE2A3]/30 border border-[#BCE2A3]">
                        <div className="h-2 w-2 rounded-full bg-[#5A724A] animate-pulse" />
                        <span className="text-xs font-mono font-bold text-[#425934]">
                            T-{tableId || '?'}
                        </span>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto p-4 max-w-md relative z-0">
                <Outlet />
            </main>

            {/* Organic Ambient Background Accents */}
            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden opacity-60">
                <div className="absolute top-[-10%] right-[-15%] w-[420px] h-[420px] bg-[#BCE2A3]/25 rounded-full blur-[90px]" />
                <div className="absolute bottom-[5%] left-[-15%] w-[380px] h-[380px] bg-[#5A724A]/10 rounded-full blur-[100px]" />
            </div>
        </div>
    );
}
