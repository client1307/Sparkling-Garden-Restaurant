import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

const COMMON_UNITS = ['kg', 'liters', 'pcs', 'grams', 'packets', 'boxes', 'bundles'];

export const InventoryForm = ({ initialData, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState({
        name: '',
        quantity: '',
        unit: 'kg',
        threshold: 5
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                quantity: initialData.quantity !== undefined ? initialData.quantity : '',
                unit: initialData.unit || 'kg',
                threshold: initialData.threshold !== undefined ? initialData.threshold : 5
            });
        } else {
            setFormData({
                name: '',
                quantity: '',
                unit: 'kg',
                threshold: 5
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            name: formData.name.trim(),
            quantity: Number(formData.quantity) || 0,
            unit: (formData.unit || 'kg').trim(),
            threshold: Number(formData.threshold) >= 0 ? Number(formData.threshold) : 5
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 text-[#222222]">
            <div>
                <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                    Ingredient Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g. Fresh Paneer, Basmati Rice, Butter"
                    className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white focus:ring-2 focus:ring-[#5A724A]/10 transition-all font-semibold text-sm"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                        Current Stock Level <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.1"
                        placeholder="25"
                        className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#5A724A] font-bold font-mono focus:outline-none focus:border-[#5A724A] focus:bg-white text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider">
                        Unit of Measure <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <select
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] focus:outline-none focus:border-[#5A724A] focus:bg-white text-sm font-medium"
                        >
                            {COMMON_UNITS.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-[#818181] mb-1.5 uppercase tracking-wider flex items-center justify-between">
                    <span>Low Stock Alert Threshold</span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Warning Level
                    </span>
                </label>
                <input
                    type="number"
                    name="threshold"
                    value={formData.threshold}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.1"
                    placeholder="5"
                    className="w-full bg-[#F8F8F8] border border-[#EBEBEB] rounded-2xl p-3 text-[#222222] font-mono focus:outline-none focus:border-[#5A724A] focus:bg-white text-sm"
                />
                <p className="text-[11px] text-[#818181] mt-1.5">
                    When stock drops below this number, the item triggers an automatic low-stock badge on the dashboard.
                </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-5 border-t border-[#EBEBEB] mt-6">
                <Button type="button" variant="outline" onClick={onCancel} className="rounded-full py-2.5 text-xs font-bold">
                    Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving} className="rounded-full py-2.5 text-xs font-bold shadow-xs">
                    {isSaving ? 'Saving Item...' : (initialData ? 'Update Stock Item' : 'Add Stock Item')}
                </Button>
            </div>
        </form>
    );
};
