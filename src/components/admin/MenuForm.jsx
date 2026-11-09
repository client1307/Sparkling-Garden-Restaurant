import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Sparkles, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';

const PRESET_CATEGORIES = [
    'Paneer Dish',
    'Starters',
    'Chinese',
    'Tandoor',
    'Rice & Pulao',
    'Sizzler',
    'Indian Dishes',
    'Kaju Dish',
    'Kofta',
    'Baked Dishes',
    'Pizza',
    'Sandwich',
    'Soup',
    'Salad & Raita',
    'Beverages',
    'Milk Shake',
    'Platter & Fix Lunch'
];

const DEFAULT_CATEGORY_IMAGES = {
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

export const MenuForm = ({ initialData, inventoryItems = [], onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Paneer Dish',
        customCategory: '',
        price: '',
        imageUrl: '',
        isVeg: true,
        ingredients: [],
        description: '',
        popularityScore: 50,
        isAvailable: true
    });

    useEffect(() => {
        if (initialData) {
            const isKnownCategory = PRESET_CATEGORIES.includes(initialData.category);
            setFormData({
                name: initialData.name || '',
                category: isKnownCategory ? initialData.category : 'Other',
                customCategory: isKnownCategory ? '' : (initialData.category || ''),
                price: initialData.price !== undefined ? initialData.price : '',
                imageUrl: initialData.imageUrl || '',
                isVeg: initialData.isVeg !== undefined ? initialData.isVeg : true,
                ingredients: Array.isArray(initialData.ingredients)
                    ? initialData.ingredients.map(ing => ({
                        ingredientId: ing.ingredientId?._id || ing.ingredientId || '',
                        quantityRequired: ing.quantityRequired || 0
                    }))
                    : [],
                description: initialData.description || '',
                popularityScore: initialData.popularityScore || 50,
                isAvailable: initialData.isAvailable !== undefined ? initialData.isAvailable : true
            });
        } else {
            setFormData({
                name: '',
                category: 'Paneer Dish',
                customCategory: '',
                price: '',
                imageUrl: DEFAULT_CATEGORY_IMAGES['Paneer Dish'],
                isVeg: true,
                ingredients: [],
                description: '',
                popularityScore: 50,
                isAvailable: true
            });
        }
    }, [initialData]);

    const handleCategoryChange = (e) => {
        const cat = e.target.value;
        const currentImg = formData.imageUrl;
        const isCurrentDefault = Object.values(DEFAULT_CATEGORY_IMAGES).includes(currentImg) || !currentImg;

        setFormData(prev => ({
            ...prev,
            category: cat,
            imageUrl: isCurrentDefault && DEFAULT_CATEGORY_IMAGES[cat] ? DEFAULT_CATEGORY_IMAGES[cat] : prev.imageUrl
        }));
    };

    const handleAddIngredient = () => {
        setFormData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { ingredientId: '', quantityRequired: 0 }]
        }));
    };

    const handleRemoveIngredient = (index) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.filter((_, i) => i !== index)
        }));
    };

    const handleIngredientChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) => i === index ? { ...ing, [field]: field === 'quantityRequired' ? Number(value) : value } : ing)
        }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const resolvedCategory = formData.category === 'Other'
            ? (formData.customCategory.trim() || 'General')
            : formData.category;

        const resolvedImage = formData.imageUrl.trim() || DEFAULT_CATEGORY_IMAGES[resolvedCategory] || 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80';

        const payload = {
            ...formData,
            category: resolvedCategory,
            price: Number(formData.price),
            imageUrl: resolvedImage,
            ingredients: formData.ingredients.filter(ing => ing.ingredientId && ing.quantityRequired > 0)
        };

        onSave(payload);
    };

    const activeDisplayImage = formData.imageUrl || DEFAULT_CATEGORY_IMAGES[formData.category] || DEFAULT_CATEGORY_IMAGES['Paneer Dish'];

    return (
        <form onSubmit={handleSubmit} className="space-y-5 text-[#222222]">
            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                        Dish Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Special Paneer Tikka Masala"
                        className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white focus:ring-2 focus:ring-[#5A724A]/10 transition-all font-semibold text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={formData.category}
                        onChange={handleCategoryChange}
                        className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white text-sm font-medium"
                    >
                        {PRESET_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        <option value="Other">+ Custom Category...</option>
                    </select>

                    {formData.category === 'Other' && (
                        <input
                            type="text"
                            name="customCategory"
                            value={formData.customCategory}
                            onChange={handleChange}
                            required
                            placeholder="Type new category name..."
                            className="w-full mt-2 bg-[#F8F8F8] border border-[#EBEBEB] rounded-xl p-2.5 text-xs text-[#222222] focus:border-[#5A724A] outline-none"
                        />
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                        Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#5A724A]">₹</span>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            required
                            min="0"
                            placeholder="240"
                            className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 pl-8 text-[#5A724A] font-bold font-mono focus:outline-none focus:border-[#5A724A] focus:bg-white text-sm"
                        />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#818181] uppercase tracking-wider">Food Image URL</label>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: DEFAULT_CATEGORY_IMAGES[prev.category] || DEFAULT_CATEGORY_IMAGES['Paneer Dish'] }))}
                            className="text-[11px] text-[#5A724A] font-bold hover:underline flex items-center gap-1"
                        >
                            <Sparkles size={12} /> Auto-suggest genuine photo
                        </button>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-[#EBEBEB] bg-[#F8F8F8] shrink-0 shadow-2xs">
                            <img
                                src={activeDisplayImage}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'; }}
                            />
                        </div>
                        <input
                            type="url"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={handleChange}
                            placeholder="https://images.unsplash.com/..."
                            className="flex-1 bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white text-xs font-mono"
                        />
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="2"
                        placeholder="Fresh cottage cheese cooked in creamy tomato butter gravy with aromatic spices."
                        className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white text-xs leading-relaxed"
                    />
                </div>

                <div className="col-span-1 md:col-span-2 flex flex-wrap items-center gap-6 bg-[#F8F8F8] p-3.5 rounded-2xl border border-[#EBEBEB]">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isVeg"
                            checked={formData.isVeg}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-[#5A724A] accent-[#5A724A]"
                        />
                        <span className="text-xs font-bold text-[#222222]">Pure Vegetarian</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isAvailable"
                            checked={formData.isAvailable}
                            onChange={handleChange}
                            className="w-4 h-4 rounded text-[#5A724A] accent-[#5A724A]"
                        />
                        <span className="text-xs font-bold text-[#222222]">Available for Ordering</span>
                    </label>
                </div>
            </div>

            {/* Bill of Materials / Ingredients */}
            <div className="pt-4 border-t border-[#EBEBEB]">
                <div className="flex justify-between items-center mb-3">
                    <div>
                        <h4 className="text-xs font-bold text-[#222222] uppercase tracking-wider">Kitchen Ingredients</h4>
                        <p className="text-[11px] text-[#818181]">Auto-deducts inventory when orders are placed.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="text-xs text-[#5A724A] font-bold bg-[#BCE2A3]/30 hover:bg-[#BCE2A3]/60 px-3 py-1 rounded-full border border-[#BCE2A3] transition-all flex items-center gap-1"
                    >
                        <Plus size={13} /> Add Ingredient
                    </button>
                </div>

                <div className="space-y-2.5">
                    {formData.ingredients.map((ing, i) => (
                        <div key={i} className="flex gap-2 items-center bg-[#F8F8F8] p-2.5 rounded-2xl border border-[#EBEBEB]">
                            <select
                                value={ing.ingredientId}
                                onChange={(e) => handleIngredientChange(i, 'ingredientId', e.target.value)}
                                className="flex-1 bg-white border border-[#EBEBEB] rounded-xl text-xs text-[#222222] p-2 outline-none focus:border-[#5A724A]"
                            >
                                <option value="">Select inventory item...</option>
                                {inventoryItems.map(inv => (
                                    <option key={inv._id || inv.id} value={inv._id || inv.id}>
                                        {inv.name} ({inv.unit})
                                    </option>
                                ))}
                            </select>

                            <div className="w-24">
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={ing.quantityRequired}
                                    onChange={(e) => handleIngredientChange(i, 'quantityRequired', e.target.value)}
                                    step="0.01"
                                    min="0"
                                    className="w-full bg-white border border-[#EBEBEB] rounded-xl text-xs font-mono font-bold text-[#5A724A] p-2 outline-none focus:border-[#5A724A]"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => handleRemoveIngredient(i)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}

                    {formData.ingredients.length === 0 && (
                        <div className="p-3.5 text-center border border-dashed border-[#EBEBEB] rounded-2xl bg-white text-xs text-[#818181]">
                            No ingredients linked (optional).
                        </div>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 justify-end pt-4 border-t border-[#EBEBEB]">
                <Button type="button" variant="outline" onClick={onCancel} className="rounded-full py-2.5 text-xs font-bold">
                    Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving} className="rounded-full py-2.5 text-xs font-bold shadow-xs">
                    {isSaving ? 'Saving Dish...' : (initialData ? 'Update Menu Item' : 'Create Menu Item')}
                </Button>
            </div>
        </form>
    );
};
