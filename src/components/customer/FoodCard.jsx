import { useCart } from '../../context/CartContext';
import { Plus, Minus, Star, Flame, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_IMAGES = {
    'Paneer Dish': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80',
    'Starters': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=800&q=80',
    'Chinese': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80',
    'Tandoor': 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80',
    'Rice & Pulao': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
    'Sizzler': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    'Pizza': 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80',
    'Sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
    'Soup': 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
    'Beverages': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
    'Milk Shake': 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    'Salad & Raita': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
    'Kaju Dish': 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    'Indian Dishes': 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    'Kofta': 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80',
    'Baked Dishes': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80',
    'Platter & Fix Lunch': 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80',
};

const getDishImage = (item) => {
    const raw = item.image || item.imageUrl;
    if (raw && !raw.includes('placeholder') && !raw.includes('ui-avatars')) {
        return raw;
    }
    const name = (item.name || '').toLowerCase();
    if (name.includes('biriyani') || name.includes('biryani')) {
        return 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('paneer')) {
        return 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('sizzler')) {
        return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('dal bati') || name.includes('thali') || name.includes('lunch') || name.includes('platter')) {
        return 'https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('naan') || name.includes('roti') || name.includes('parotha') || name.includes('paratha')) {
        return 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('pizza')) {
        return 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('sandwich')) {
        return 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('noodle') || name.includes('manchurian') || name.includes('chilly') || name.includes('fried rice')) {
        return 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('soup')) {
        return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('lassi') || name.includes('milk') || name.includes('shake') || name.includes('mojito') || name.includes('soda') || name.includes('drink') || name.includes('lagoon')) {
        return 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80';
    }
    return CATEGORY_IMAGES[item.category] || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80';
};

export const FoodCard = ({ item, onClick }) => {
    const { cartItems, addToCart, removeFromCart, updateQuantity } = useCart();

    const itemId = item._id || item.id;
    const cartItem = cartItems.find((c) => (c._id || c.id) === itemId);
    const quantity = cartItem ? cartItem.quantity : 0;

    const handleMinus = (e) => {
        e.stopPropagation();
        if (quantity === 1) {
            removeFromCart(itemId);
        } else if (quantity > 1) {
            updateQuantity(itemId, -1);
        }
    };

    const handlePlus = (e) => {
        e.stopPropagation();
        if (quantity === 0) {
            addToCart(item);
        } else {
            updateQuantity(itemId, 1);
        }
    };

    return (
        <div
            onClick={onClick}
            className={clsx(
                "group flex flex-col h-full bg-white rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(90,114,74,0.05)] hover:shadow-[0_12px_32px_rgba(90,114,74,0.12)] border border-[#EBEBEB] cursor-pointer transition-all duration-300 hover:-translate-y-1",
                !item.isAvailable && "opacity-60 grayscale"
            )}
        >
            {/* Image Box */}
            <div className="relative aspect-[4/3] w-full bg-[#F4F6F0] overflow-hidden shrink-0">
                <img
                    src={getDishImage(item)}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />

                {/* Top Left Badge */}
                {item.isPopular && !item.isTrending && (
                    <div className="absolute top-2.5 left-2.5 bg-[#BCE2A3] text-[#222222] text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm tracking-wide">
                        <Star size={11} fill="currentColor" /> POPULAR
                    </div>
                )}
                {item.isTrending && (
                    <div className="absolute top-2.5 left-2.5 bg-[#5A724A] text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm tracking-wide">
                        <Flame size={11} fill="currentColor" /> TRENDING
                    </div>
                )}

                {/* Top Right Dietary Badge */}
                <div className={clsx(
                    "absolute top-2.5 right-2.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm tracking-wider uppercase border",
                    item.isVeg
                        ? "bg-white/95 text-[#5A724A] border-[#BCE2A3]"
                        : "bg-white/95 text-[#B84E3A] border-[#F2C2B8]"
                )}>
                    {item.isVeg ? "VEG" : "NON-VEG"}
                </div>

                {!item.isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-10">
                        <span className="bg-white text-[#222222] px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg">
                            Sold Out
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col flex-1 bg-white">
                <div className="flex justify-between items-start mb-1.5 gap-2">
                    <h3 className="font-bold text-[#222222] text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#5A724A] transition-colors">
                        {item.name}
                    </h3>
                    <span className="font-bold text-[#5A724A] text-base sm:text-lg whitespace-nowrap">
                        <span className="text-xs">₹</span>{item.price}
                    </span>
                </div>

                <div className="flex items-center text-[10px] sm:text-xs text-[#818181] mb-2 gap-1.5 font-medium">
                    <span>{item.calories || "480"} cal</span>
                    <span>•</span>
                    <span>~{item.preparationTime || item.prepTime || "15"} min</span>
                </div>

                <p className="text-[11px] sm:text-xs text-[#818181] line-clamp-2 mb-4 flex-1 leading-relaxed">
                    {item.description || "Fresh artisan ingredients and herbs."}
                </p>

                {/* Action Button: Pill-shaped dark charcoal or stepper */}
                <div className="mt-auto h-10 w-full shrink-0" onClick={(e) => e.stopPropagation()}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        {quantity === 0 ? (
                            <motion.button
                                key="add"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handlePlus}
                                disabled={!item.isAvailable}
                                className="w-full h-full bg-[#222222] hover:bg-[#5A724A] text-white font-semibold rounded-full flex items-center justify-center gap-1.5 transition-colors text-xs tracking-wide shadow-sm"
                            >
                                <Plus size={14} strokeWidth={2.5} /> Add to Order
                            </motion.button>
                        ) : (
                            <motion.div
                                key="stepper"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-full flex items-center justify-between bg-[#F4F6F0] border border-[#BCE2A3] rounded-full px-1.5 shadow-xs"
                            >
                                <button
                                    onClick={handleMinus}
                                    className="w-7 h-7 flex items-center justify-center text-[#5A724A] bg-white rounded-full shadow-xs hover:bg-[#5A724A] hover:text-white transition-colors"
                                    aria-label="Decrease quantity"
                                >
                                    <Minus size={14} strokeWidth={2.5} />
                                </button>
                                <span className="font-bold text-[#222222] text-sm px-2">{quantity}</span>
                                <button
                                    onClick={handlePlus}
                                    className="w-7 h-7 flex items-center justify-center bg-[#5A724A] text-white rounded-full shadow-xs hover:bg-[#485D3B] transition-colors"
                                    aria-label="Increase quantity"
                                >
                                    <Plus size={14} strokeWidth={2.5} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
