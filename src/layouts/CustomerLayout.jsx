import { Outlet, useParams } from 'react-router-dom';
import { OfflineBanner } from '../components/ui/OfflineBanner';
import { motion } from 'framer-motion';

export default function CustomerLayout() {
    const { tableId } = useParams();

    return (
        <div className="min-h-screen bg-[#F4F6F0] text-[#222222] pb-24 selection:bg-[#BCE2A3] selection:text-[#222222]">
            <OfflineBanner />
            
            {/* Top Navbar */}
            <nav className="sticky top-0 z-50 border-b border-[#EBEBEB] bg-white/90 backdrop-blur-md px-5 py-4 flex justify-between items-center transition-all">
                <a href="/" className="flex items-center gap-2.5 group">
                    <img 
                        src="/images/sparkling-logo-dark.png" 
                        alt="The Sparkling Garden Restaurant" 
                        className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
                    />
                    <div className="border-l border-[#EBEBEB] pl-2.5 hidden sm:block">
                        <span className="text-[10px] uppercase tracking-wider text-[#5A724A] font-extrabold block">Garden Restaurant</span>
                        <span className="text-[9px] text-[#818181] font-medium block">Digital Guest Menu</span>
                    </div>
                </a>

                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[#5A724A] animate-pulse" />
                    <span className="text-xs font-mono font-bold text-[#425934] px-3 py-1 rounded-full bg-[#BCE2A3]/30 border border-[#BCE2A3]">
                        Table {tableId || '?'}
                    </span>
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
