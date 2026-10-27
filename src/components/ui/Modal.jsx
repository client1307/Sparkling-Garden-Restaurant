import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children }) => {
    // Lock background scrolling while modal is open
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen]);

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-[#222222]/60 backdrop-blur-sm z-0"
                    />

                    {/* Modal Content Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 16 }}
                        transition={{ type: "spring", damping: 26, stiffness: 320 }}
                        className="relative z-10 bg-white border border-[#EBEBEB] rounded-3xl w-full max-w-xl shadow-[0_25px_70px_rgba(34,34,34,0.25)] flex flex-col max-h-[88vh] my-auto overflow-hidden pointer-events-auto"
                    >
                        <div className="px-6 py-4.5 border-b border-[#EBEBEB] flex justify-between items-center bg-[#F8F8F8] shrink-0">
                            <h3 className="text-base sm:text-lg font-bold text-[#222222] tracking-tight">{title}</h3>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Close dialog"
                                className="w-8 h-8 rounded-full bg-white border border-[#EBEBEB] flex items-center justify-center text-[#818181] hover:text-[#222222] hover:border-[#818181] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 sm:p-6 overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
