import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingBag, Sparkles, Navigation, ChevronRight } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { FoodCard } from '../../components/customer/FoodCard';
import CategoryFilter from '../../components/customer/CategoryFilter';
import AIChatPanel from '../../components/customer/AIChatPanel';
import { MENU_ITEMS, CATEGORIES } from '../../services/mockData';
import { api, socket } from '../../services/api';
import toast from 'react-hot-toast';

const Menu = () => {
    const { tableId } = useParams();
    const { cartItems, total, totalItems, addToCart } = useCart();
    
    // State
    const [menuItems, setMenuItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [showAIChat, setShowAIChat] = useState(false);

    // Fetch Menu
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await api.get('/menu');
                const data = res.data || [];
                setMenuItems(data.length > 0 ? data : MENU_ITEMS);
                setIsLoading(false);
            } catch (error) {
                console.error("Error loading menu:", error);
                setMenuItems(MENU_ITEMS);
                setIsLoading(false);
            }
        };
        fetchMenu();
    }, []);

    // Derived Data
    const dynamicCategories = useMemo(() => {
        const uniqueCats = Array.from(new Set(menuItems.map(item => item.category))).filter(Boolean);
        return ['All', ...uniqueCats];
    }, [menuItems]);

    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [menuItems, searchQuery, activeCategory]);

    const chefSelections = useMemo(() => {
        return menuItems.filter(item => item.isTrending || item.isPopular);
    }, [menuItems]);

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-[#F4F6F0] text-[#222222] font-body pb-32">
            {/* Restaurant Brand Banner with Official Logo */}
            <div className="mb-6 relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1C2B1A] via-[#2D4226] to-[#1C2B1A] text-white p-5 shadow-[0_12px_32px_rgba(47,68,40,0.18)] border border-[#5A724A]/30">
                <div className="flex items-center justify-between gap-3 relative z-10">
                    <div className="flex-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#BCE2A3]/20 border border-[#BCE2A3]/30 text-[10px] font-bold text-[#BCE2A3] uppercase tracking-wider mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#BCE2A3] animate-pulse" />
                            Table {tableId || 'Guest'} · Dine-In
                        </span>
                        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">The Sparkling Menu</h2>
                        <p className="text-[11px] text-white/75 mt-0.5 line-clamp-1">
                            100% Pure Veg Garden Restaurant · Deesa
                        </p>
                    </div>
                    <div className="bg-white p-2 rounded-2xl shadow-md border border-white/20 shrink-0">
                        <img 
                            src="/images/sparkling-logo-dark.png" 
                            alt="The Sparkling" 
                            className="h-10 w-auto object-contain" 
                        />
                    </div>
                </div>
            </div>

            {/* Search Bar - Pill-shaped */}
            <div className="mb-6">
                <div className="relative flex items-center bg-white border border-[#EBEBEB] rounded-full shadow-xs focus-within:border-[#5A724A] focus-within:ring-2 focus-within:ring-[#5A724A]/10 transition-all">
                    <div className="pl-4 text-[#818181]">
                        <Search size={18} />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search dishes, burgers, pizzas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-11 bg-transparent outline-none px-3 text-[#222222] placeholder:text-[#818181] text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mr-3 text-xs text-[#818181] hover:text-[#222222] bg-[#F8F8F8] px-2 py-0.5 rounded-full"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mb-7 -mx-4 px-4">
                <CategoryFilter 
                    categories={dynamicCategories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </div>

            {/* Chef's Selection Horizontal Reel */}
            {!searchQuery && activeCategory === 'All' && chefSelections.length > 0 && (
                <div className="mb-8 -mx-4 pl-4">
                    <div className="flex items-center justify-between mb-3 pr-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">✨</span>
                            <h2 className="uppercase tracking-wider text-xs font-bold text-[#5A724A]">Featured Highlights</h2>
                        </div>
                        <span className="text-[11px] text-[#818181]">Handcrafted</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide pr-4 pb-2 snap-x">
                        {chefSelections.slice(0, 4).map(item => (
                            <motion.div 
                                key={item._id || item.id}
                                className="min-w-[260px] w-[260px] snap-center"
                                initial="hidden"
                                animate="visible"
                                variants={itemVariants}
                            >
                                <FoodCard item={item} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Menu Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="uppercase tracking-wider text-xs font-bold text-[#818181]">
                        {searchQuery ? `Results for "${searchQuery}"` : `${activeCategory} Items`}
                    </h2>
                    <span className="text-xs text-[#818181] font-mono">{filteredItems.length} items</span>
                </div>
                
                {filteredItems.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#EBEBEB]">
                        <p className="text-3xl mb-2">✨</p>
                        <p className="text-[#818181] text-sm font-medium">No dishes found matching your selection.</p>
                    </div>
                ) : (
                    <motion.div 
                        key={`${activeCategory}-${searchQuery}`}
                        className="grid grid-cols-2 gap-3.5 sm:gap-4"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {filteredItems.map((item) => (
                            <motion.div key={item._id || item.id} variants={itemVariants}>
                                <FoodCard item={item} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Mobile Docked Bottom Cart Bar */}
            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.div 
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                        className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:pb-4 bg-white/95 backdrop-blur-md border-t border-[#EBEBEB] shadow-[0_-8px_30px_rgba(0,0,0,0.1)] pointer-events-auto"
                    >
                        <Link to={`/table/${tableId}/cart`} className="block group max-w-md mx-auto">
                            <div className="bg-[#1C2B1A] border border-[#5A724A]/40 text-white rounded-2xl p-3 sm:px-4 flex items-center justify-between shadow-md hover:bg-[#152213] transition-all">
                                {/* Left Side: Count & Total Price */}
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#5A724A] text-white rounded-xl w-10 h-10 flex items-center justify-center relative font-bold shrink-0 shadow-xs">
                                        <ShoppingBag size={18} />
                                        <span className="absolute -top-1.5 -right-1.5 bg-[#BCE2A3] text-[#1C2B1A] text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-5 h-5 flex items-center justify-center border-2 border-[#1C2B1A]">
                                            {totalItems}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/70">Total</span>
                                            <span className="font-mono font-extrabold text-lg text-[#BCE2A3]">₹{total.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[10px] text-white/60">{totalItems} {totalItems === 1 ? 'dish' : 'dishes'} added</p>
                                    </div>
                                </div>

                                {/* Right Side: View Cart CTA */}
                                <div className="flex items-center gap-1.5 bg-[#5A724A] group-hover:bg-[#485D3B] text-white px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors shadow-xs">
                                    <span>View Cart</span>
                                    <ChevronRight size={15} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* AI Assistant FAB Button (Shifted above cart bar when cart is visible) */}
            <motion.button 
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAIChat(true)}
                className={`fixed right-4 z-40 w-12 h-12 rounded-full bg-[#5A724A] text-white shadow-[0_6px_24px_rgba(90,114,74,0.35)] flex items-center justify-center group transition-all duration-300 ${totalItems > 0 ? 'bottom-22' : 'bottom-6'}`}
                aria-label="Open AI Culinary Concierge"
            >
                <div className="absolute inset-0 rounded-full border-2 border-[#BCE2A3] animate-ping opacity-40 pointer-events-none" />
                <span className="text-xl transform group-hover:rotate-12 transition-transform">✨</span>
            </motion.button>

            {/* AI Panel Component */}
            <AIChatPanel isOpen={showAIChat} onClose={() => setShowAIChat(false)} />
        </div>
    );
};

export default Menu;
