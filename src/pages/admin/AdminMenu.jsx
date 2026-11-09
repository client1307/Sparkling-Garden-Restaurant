import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
    Image as ImageIcon, IndianRupee, Tag, Filter, RefreshCw, 
    Sparkles, AlertCircle, X, Check, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

// Curated high-res Indian food photos for instant selection
const FOOD_IMAGE_PRESETS = [
    { label: 'Tomato Soup', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80' },
    { label: 'Paneer Tikka / Starters', url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80' },
    { label: 'Veg Biryani', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80' },
    { label: 'Butter Naan / Roti', url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80' },
    { label: 'Dal Makhani', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80' },
    { label: 'Gulab Jamun / Desserts', url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80' },
    { label: 'Mocktail / Beverage', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80' },
    { label: 'Crispy Snack', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
];

export default function AdminMenu() {
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dietFilter, setDietFilter] = useState('all'); // 'all' | 'veg' | 'non-veg'
    const [availFilter, setAvailFilter] = useState('all'); // 'all' | 'available' | 'unavailable'

    // Add / Edit Modal
    const [isDishModalOpen, setIsDishModalOpen] = useState(false);
    const [editingDish, setEditingDish] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Dish Form Data
    const [formData, setFormData] = useState({
        name: '',
        category: 'Starters',
        price: '',
        isVeg: true,
        description: '',
        imageUrl: FOOD_IMAGE_PRESETS[0].url,
        isAvailable: true
    });

    // Category Management Modal
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [renameOldCategory, setRenameOldCategory] = useState('');
    const [renameNewCategory, setRenameNewCategory] = useState('');

    // Inline price editing tracker: { [id]: price }
    const [inlinePrices, setInlinePrices] = useState({});

    // Fetch Menu & Categories
    const loadMenuData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [itemsRes, catRes] = await Promise.all([
                api.get('/menu'),
                api.get('/menu/categories').catch(() => ({ data: [] }))
            ]);
            setMenuItems(itemsRes.data || []);
            setCategories(catRes.data || []);
            setIsLoading(false);
        } catch (err) {
            console.error('Failed to load menu data:', err);
            toast.error('Failed to load menu data');
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMenuData();
    }, [loadMenuData]);

    // Open Add Dish
    const handleOpenAdd = () => {
        setEditingDish(null);
        setFormData({
            name: '',
            category: categories[0]?.name || 'Starters',
            price: '',
            isVeg: true,
            description: '',
            imageUrl: FOOD_IMAGE_PRESETS[0].url,
            isAvailable: true
        });
        setIsDishModalOpen(true);
    };

    // Open Edit Dish
    const handleOpenEdit = (dish) => {
        setEditingDish(dish);
        setFormData({
            name: dish.name || '',
            category: dish.category || 'Starters',
            price: dish.price?.toString() || '',
            isVeg: dish.isVeg !== false,
            description: dish.description || '',
            imageUrl: dish.imageUrl || FOOD_IMAGE_PRESETS[0].url,
            isAvailable: dish.isAvailable !== false
        });
        setIsDishModalOpen(true);
    };

    // Save Dish (Add or Update)
    const handleSaveDish = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.category || !formData.price) {
            toast.error('Please fill in dish name, category, and price');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name: formData.name.trim(),
                category: formData.category.trim(),
                price: Number(formData.price),
                isVeg: Boolean(formData.isVeg),
                description: formData.description.trim(),
                imageUrl: formData.imageUrl.trim() || FOOD_IMAGE_PRESETS[0].url,
                isAvailable: Boolean(formData.isAvailable)
            };

            if (editingDish) {
                await api.put(`/menu/${editingDish._id}`, payload);
                toast.success(`Dish "${payload.name}" updated successfully`);
            } else {
                await api.post('/menu', payload);
                toast.success(`Dish "${payload.name}" added to menu`);
            }

            setIsDishModalOpen(false);
            loadMenuData();
        } catch (err) {
            console.error('Failed to save dish:', err);
            toast.error(err.response?.data?.message || 'Failed to save menu item');
        } finally {
            setIsSaving(false);
        }
    };

    // Delete Dish
    const handleDeleteDish = async (dish) => {
        if (!window.confirm(`Are you sure you want to delete "${dish.name}" from the menu?`)) return;
        try {
            await api.delete(`/menu/${dish._id}`);
            toast.success(`Dish "${dish.name}" deleted`);
            loadMenuData();
        } catch (err) {
            console.error('Failed to delete dish:', err);
            toast.error(err.response?.data?.message || 'Failed to delete dish');
        }
    };

    // Quick Toggle Availability (A07)
    const handleToggleAvailability = async (dish) => {
        try {
            const updated = !dish.isAvailable;
            // Optimistic update
            setMenuItems(prev => prev.map(item => item._id === dish._id ? { ...item, isAvailable: updated } : item));
            await api.put(`/menu/${dish._id}`, { isAvailable: updated });
            toast.success(`${dish.name} is now ${updated ? 'Available' : 'Unavailable (Sold Out)'}`);
        } catch (err) {
            toast.error('Failed to update availability');
            loadMenuData();
        }
    };

    // Quick Update Price (A06)
    const handleSaveInlinePrice = async (dish) => {
        const newPrice = inlinePrices[dish._id];
        if (newPrice === undefined || isNaN(newPrice) || Number(newPrice) <= 0) return;

        try {
            await api.put(`/menu/${dish._id}`, { price: Number(newPrice) });
            toast.success(`Updated ${dish.name} price to ₹${newPrice}`);
            setMenuItems(prev => prev.map(item => item._id === dish._id ? { ...item, price: Number(newPrice) } : item));
            setInlinePrices(prev => {
                const next = { ...prev };
                delete next[dish._id];
                return next;
            });
        } catch (err) {
            toast.error('Failed to update price');
        }
    };

    // Rename Category (A04)
    const handleRenameCategory = async (e) => {
        e.preventDefault();
        if (!renameOldCategory || !renameNewCategory.trim()) return;
        try {
            await api.put('/menu/categories', {
                oldName: renameOldCategory,
                newName: renameNewCategory.trim()
            });
            toast.success(`Renamed category to "${renameNewCategory}"`);
            setRenameOldCategory('');
            setRenameNewCategory('');
            loadMenuData();
        } catch (err) {
            toast.error('Failed to rename category');
        }
    };

    // Delete Category (A04)
    const handleDeleteCategory = async (catName) => {
        if (!window.confirm(`Delete category "${catName}"? Dishes in this category will be moved to "General".`)) return;
        try {
            await api.delete(`/menu/categories/${encodeURIComponent(catName)}`);
            toast.success(`Category "${catName}" removed`);
            loadMenuData();
        } catch (err) {
            toast.error('Failed to delete category');
        }
    };

    // Add New Category (A04)
    const handleCreateCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setCategories(prev => [...prev, { name: newCategoryName.trim(), count: 0, availableCount: 0 }]);
        setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
        toast.success(`Category "${newCategoryName.trim()}" ready`);
        setNewCategoryName('');
        setIsCategoryModalOpen(false);
        setIsDishModalOpen(true);
    };

    // Filtered Items
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
            const matchesSearch = !searchQuery.trim() || 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesDiet = dietFilter === 'all' || 
                (dietFilter === 'veg' && item.isVeg) || 
                (dietFilter === 'non-veg' && !item.isVeg);
            const matchesAvail = availFilter === 'all' || 
                (availFilter === 'available' && item.isAvailable) || 
                (availFilter === 'unavailable' && !item.isAvailable);

            return matchesCategory && matchesSearch && matchesDiet && matchesAvail;
        });
    }, [menuItems, selectedCategory, searchQuery, dietFilter, availFilter]);

    // Unique category list for tab pills
    const categoryTabs = useMemo(() => {
        const set = new Set();
        menuItems.forEach(i => { if (i.category) set.add(i.category); });
        categories.forEach(c => { if (c.name) set.add(c.name); });
        return ['ALL', ...Array.from(set)];
    }, [menuItems, categories]);

    return (
        <div className="text-[#222222] max-w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">Menu &amp; Food Catalog</h1>
                    <p className="text-[#818181] text-xs mt-1">
                        Total {menuItems.length} dishes • {menuItems.filter(i => i.isAvailable).length} Available • {categories.length} Categories
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="px-4 py-2.5 rounded-full border border-[#EBEBEB] bg-white hover:border-[#5A724A] text-xs font-bold text-[#222222] flex items-center gap-1.5 transition-all shadow-xs"
                    >
                        <Tag size={14} className="text-[#5A724A]" />
                        Manage Categories
                    </button>
                    <button
                        onClick={handleOpenAdd}
                        className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs"
                    >
                        <Plus size={16} />
                        Add New Dish
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#EBEBEB] shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#818181]" size={16} />
                        <input
                            type="text"
                            placeholder="Search dishes by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs border border-[#EBEBEB] rounded-full bg-[#F8F8F8] focus:bg-white focus:border-[#5A724A] outline-none transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#818181] hover:text-[#222222]">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Diet Filter */}
                    <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-full border border-[#EBEBEB]">
                        {['all', 'veg', 'non-veg'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setDietFilter(filter)}
                                className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                                    dietFilter === filter ? "bg-white text-[#222222] shadow-xs" : "text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                {filter === 'all' ? 'All Diets' : filter === 'veg' ? '🟢 Veg Only' : '🔴 Non-Veg'}
                            </button>
                        ))}
                    </div>

                    {/* Availability Filter */}
                    <div className="flex items-center gap-1 bg-[#F8F8F8] p-1 rounded-full border border-[#EBEBEB]">
                        {['all', 'available', 'unavailable'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setAvailFilter(filter)}
                                className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-bold capitalize transition-all",
                                    availFilter === filter ? "bg-[#5A724A] text-white" : "text-[#818181] hover:text-[#222222]"
                                )}
                            >
                                {filter === 'all' ? 'All Status' : filter === 'available' ? 'Available' : 'Sold Out'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Pills (A04) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                    {categoryTabs.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={clsx(
                                "px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                                selectedCategory === cat
                                    ? "bg-[#222222] text-white border-[#222222] shadow-xs"
                                    : "bg-white text-[#818181] border-[#EBEBEB] hover:border-[#5A724A] hover:text-[#222222]"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dishes Grid */}
            {isLoading ? (
                <div className="p-16 text-center text-[#818181] bg-white rounded-3xl border border-[#EBEBEB]">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-[#5A724A]" size={28} />
                    <p className="text-xs font-semibold">Loading menu items...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-16 text-center text-[#818181] bg-white rounded-3xl border border-[#EBEBEB]">
                    <AlertCircle className="mx-auto mb-2 text-amber-600" size={32} />
                    <p className="text-sm font-bold text-[#222222]">No menu items found</p>
                    <p className="text-xs mt-1">Try adjusting your search query or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map((dish) => (
                        <motion.div
                            key={dish._id}
                            layout
                            className={clsx(
                                "bg-white rounded-3xl border overflow-hidden transition-all shadow-xs flex flex-col justify-between group",
                                dish.isAvailable ? "border-[#EBEBEB] hover:border-[#5A724A]" : "border-red-200 bg-red-50/15 opacity-80"
                            )}
                        >
                            {/* Card Top: Image + Badges */}
                            <div>
                                <div className="relative h-40 w-full bg-[#F4F6F0] overflow-hidden">
                                    <img
                                        src={dish.imageUrl}
                                        alt={dish.name}
                                        className={clsx(
                                            "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105",
                                            !dish.isAvailable && "grayscale"
                                        )}
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = FOOD_IMAGE_PRESETS[0].url;
                                        }}
                                    />
                                    {/* Veg / Non-Veg Indicator */}
                                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs p-1 rounded-md border border-[#EBEBEB] shadow-xs">
                                        <div className={clsx("w-3.5 h-3.5 border flex items-center justify-center", dish.isVeg ? "border-emerald-600" : "border-red-600")}>
                                            <div className={clsx("w-2 h-2 rounded-full", dish.isVeg ? "bg-emerald-600" : "bg-red-600")} />
                                        </div>
                                    </div>

                                    {/* Category Badge */}
                                    <div className="absolute top-3 right-3 bg-black/60 text-white backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {dish.category}
                                    </div>

                                    {/* Sold out overlay */}
                                    {!dish.isAvailable && (
                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center">
                                            <span className="bg-red-600 text-white font-extrabold text-xs uppercase px-3 py-1 rounded-full tracking-wider shadow-md">
                                                Sold Out
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-extrabold text-sm text-[#222222] line-clamp-1">{dish.name}</h3>
                                    </div>

                                    {dish.description && (
                                        <p className="text-[11px] text-[#818181] line-clamp-2 leading-relaxed">
                                            {dish.description}
                                        </p>
                                    )}

                                    {/* Price editor (A06) */}
                                    <div className="pt-1 flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase text-[#818181]">Price</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono text-xs font-bold text-[#5A724A]">₹</span>
                                            <input
                                                type="number"
                                                defaultValue={dish.price}
                                                onChange={(e) => setInlinePrices({ ...inlinePrices, [dish._id]: e.target.value })}
                                                className="w-16 px-2 py-1 text-xs font-mono font-bold border border-[#EBEBEB] rounded-lg bg-[#F8F8F8] text-right outline-none focus:border-[#5A724A] focus:bg-white"
                                            />
                                            {inlinePrices[dish._id] !== undefined && inlinePrices[dish._id] !== dish.price?.toString() && (
                                                <button
                                                    onClick={() => handleSaveInlinePrice(dish)}
                                                    className="p-1 bg-[#5A724A] text-white rounded-lg hover:bg-[#485D3B]"
                                                    title="Save price change"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Quick Actions (A06, A07, CRUD) */}
                            <div className="p-3 bg-[#FAF8F5] border-t border-[#F0ECE1] flex items-center justify-between gap-2">
                                {/* Availability Switch (A07) */}
                                <button
                                    onClick={() => handleToggleAvailability(dish)}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all",
                                        dish.isAvailable
                                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                            : "bg-red-100 text-red-800 hover:bg-red-200"
                                    )}
                                    title="Toggle availability"
                                >
                                    {dish.isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                    {dish.isAvailable ? 'Available' : 'Sold Out'}
                                </button>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(dish)}
                                        className="p-1.5 rounded-xl border border-[#EBEBEB] bg-white text-[#818181] hover:text-[#5A724A] hover:border-[#5A724A] transition-all"
                                        title="Edit Dish"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteDish(dish)}
                                        className="p-1.5 rounded-xl border border-[#EBEBEB] bg-white text-[#818181] hover:text-red-600 hover:border-red-300 transition-all"
                                        title="Delete Dish"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* MODAL: ADD / EDIT DISH (A03, A05, A06, A07) */}
            <AnimatePresence>
                {isDishModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.form
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onSubmit={handleSaveDish}
                            className="bg-white rounded-3xl border border-[#EBEBEB] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-3">
                                <div>
                                    <h3 className="font-extrabold text-base text-[#222222]">
                                        {editingDish ? `Edit Dish: ${editingDish.name}` : 'Add New Dish to Menu'}
                                    </h3>
                                    <p className="text-[10px] text-[#818181]">Configure dish information, pricing, and photo</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsDishModalOpen(false)}
                                    className="p-1 rounded-full text-[#818181] hover:text-[#222222]"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Dish Name */}
                            <div>
                                <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Dish Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Paneer Butter Masala"
                                    className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                />
                            </div>

                            {/* Category & Price */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    >
                                        {categoryTabs.filter(c => c !== 'ALL').map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Price (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="e.g. 280"
                                        className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>
                            </div>

                            {/* Diet & Availability Toggles */}
                            <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-2xl border border-[#E5E0D8]">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isVeg}
                                        onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
                                        className="rounded text-[#5A724A] focus:ring-0"
                                    />
                                    <span className="text-xs font-bold text-[#222222]">
                                        {formData.isVeg ? '🟢 Vegetarian' : '🔴 Non-Veg'}
                                    </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.isAvailable}
                                        onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                                        className="rounded text-[#5A724A] focus:ring-0"
                                    />
                                    <span className="text-xs font-bold text-[#222222]">
                                        {formData.isAvailable ? '✅ Available' : '❌ Unavailable'}
                                    </span>
                                </label>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">Description</label>
                                <textarea
                                    rows="2"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Rich tomato cashew gravy infused with aromatic Indian spices..."
                                    className="w-full px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                />
                            </div>

                            {/* Image Presets & Custom URL (A05) */}
                            <div>
                                <label className="text-[11px] font-bold text-[#818181] uppercase block mb-1">
                                    Food Image URL / Select Photo Preset (A05)
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="https://images.unsplash.com/..."
                                        className="flex-1 px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                    />
                                </div>

                                {/* Preset Thumbnails */}
                                <div className="grid grid-cols-4 gap-2 pt-1">
                                    {FOOD_IMAGE_PRESETS.map((preset, i) => (
                                        <button
                                            type="button"
                                            key={i}
                                            onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                                            className={clsx(
                                                "relative h-14 rounded-xl overflow-hidden border transition-all group",
                                                formData.imageUrl === preset.url ? "border-[#5A724A] ring-2 ring-[#5A724A]/30" : "border-[#EBEBEB]"
                                            )}
                                        >
                                            <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                                            <span className="absolute inset-x-0 bottom-0 bg-black/60 text-[9px] text-white font-bold px-1 truncate">
                                                {preset.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsDishModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-[#818181] hover:text-[#222222]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-full bg-[#5A724A] hover:bg-[#485D3B] text-xs font-bold text-white transition-all shadow-xs disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : editingDish ? 'Update Dish' : 'Add to Menu'}
                                </button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: CATEGORY MANAGEMENT (A04) */}
            <AnimatePresence>
                {isCategoryModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl border border-[#EBEBEB] max-w-md w-full p-6 shadow-2xl space-y-4"
                        >
                            <div className="flex items-center justify-between border-b border-[#F4F6F0] pb-2">
                                <div>
                                    <h3 className="font-extrabold text-sm text-[#222222]">Category Management</h3>
                                    <p className="text-[10px] text-[#818181]">Add, rename, or organize menu sections</p>
                                </div>
                                <button onClick={() => setIsCategoryModalOpen(false)} className="text-[#818181] hover:text-[#222222]">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Add New Category */}
                            <form onSubmit={handleCreateCategory} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="New Category Name (e.g. Sizzlers)"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs border border-[#EBEBEB] rounded-xl bg-[#F8F8F8] outline-none focus:bg-white focus:border-[#5A724A]"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#5A724A] text-white rounded-xl text-xs font-bold hover:bg-[#485D3B]"
                                >
                                    Add
                                </button>
                            </form>

                            {/* Existing Categories List */}
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {categories.map((cat) => (
                                    <div key={cat.name} className="flex items-center justify-between p-2.5 bg-[#F8F8F8] rounded-xl border border-[#EBEBEB] text-xs">
                                        <div>
                                            <span className="font-bold text-[#222222]">{cat.name}</span>
                                            <span className="text-[10px] text-[#818181] ml-2">({cat.count} items)</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    setRenameOldCategory(cat.name);
                                                    setRenameNewCategory(cat.name);
                                                }}
                                                className="p-1 text-[#818181] hover:text-[#5A724A]"
                                                title="Rename"
                                            >
                                                <Edit2 size={13} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.name)}
                                                className="p-1 text-[#818181] hover:text-red-600"
                                                title="Delete"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Rename Section if selected */}
                            {renameOldCategory && (
                                <form onSubmit={handleRenameCategory} className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                                    <span className="text-[10px] font-bold text-amber-900 block">Rename &ldquo;{renameOldCategory}&rdquo; to:</span>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={renameNewCategory}
                                            onChange={(e) => setRenameNewCategory(e.target.value)}
                                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-amber-300 bg-white outline-none"
                                        />
                                        <button
                                            type="submit"
                                            className="px-3 py-1.5 bg-[#5A724A] text-white rounded-xl text-xs font-bold"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

