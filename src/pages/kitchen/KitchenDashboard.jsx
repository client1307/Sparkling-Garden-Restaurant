import { Printer, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KitchenDashboard() {
    return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 text-center text-[#222222]">
            <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#EBEBEB] shadow-xl space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-[#5A724A]/10 text-[#5A724A] flex items-center justify-center mx-auto">
                    <Printer size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold text-[#222222]">Direct Kitchen Thermal Printing Active</h2>
                    <p className="text-xs text-[#818181] mt-2 leading-relaxed">
                        The kitchen operates 100% on physical thermal tickets. All customer and waiter orders automatically print directly to the kitchen receipt printer. No kitchen screen or KDS display is required.
                    </p>
                </div>

                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-center gap-2 font-bold">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    <span>Direct ESC/POS Print Pipeline Online</span>
                </div>

                <div className="pt-2">
                    <Link
                        to="/portal"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-white text-xs font-bold transition-all shadow-xs"
                    >
                        <ArrowLeft size={14} />
                        Return to Staff Portal
                    </Link>
                </div>
            </div>
        </div>
    );
}
