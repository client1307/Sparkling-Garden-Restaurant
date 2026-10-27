const MenuItem = require('../models/MenuItem');
const Inventory = require('../models/Inventory');

// @desc    Get All Menu Items
// @route   GET /api/menu
const getMenuItems = async (req, res) => {
    try {
        // Find all items
        // We might want to filter active/inactive but for now return all so Admin can see Disabled ones
        const items = await MenuItem.find({}).populate('ingredients.ingredientId');
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error fetching menu' });
        console.error(error);
    }
};

// @desc    Seed Menu Items (For Demo)
// @route   POST /api/menu/seed
const seedMenu = async (req, res) => {
    // Disabled: seeding wipes the live menu. Run `npm --prefix server run seed` from a terminal instead.
    res.status(410).json({ message: 'Seeding over HTTP is disabled. Use the CLI seed script.' });
};

// @desc    Add a new Menu Item
// @route   POST /api/menu
const addMenuItem = async (req, res) => {
    try {
        let { name, category, price, imageUrl, isVeg, ingredients, description, isAvailable } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({ message: 'Name, category, and price are required' });
        }

        // Clean image URL or default to genuine category food photo
        const cleanImage = imageUrl && imageUrl.trim() ? imageUrl.trim() : 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80';

        // Filter out empty ingredient rows that lack a valid ObjectId
        const validIngredients = (ingredients || []).filter(ing => {
            const id = ing.ingredientId?._id || ing.ingredientId;
            return id && typeof id === 'string' && id.trim().length === 24;
        }).map(ing => ({
            ingredientId: ing.ingredientId?._id || ing.ingredientId,
            quantityRequired: Number(ing.quantityRequired) || 0
        }));

        const newItem = new MenuItem({
            name: name.trim(),
            category: category.trim(),
            price: Number(price),
            imageUrl: cleanImage,
            isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
            ingredients: validIngredients,
            description: (description || '').trim(),
            isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
        });

        const createdItem = await newItem.save();
        res.status(201).json(createdItem);
    } catch (error) {
        console.error('Error adding menu item:', error);
        res.status(500).json({ message: error.message || 'Error adding menu item' });
    }
};

// @desc    Update a Menu Item
// @route   PUT /api/menu/:id
const updateMenuItem = async (req, res) => {
    try {
        let { name, category, price, imageUrl, isVeg, ingredients, description, isAvailable } = req.body;
        const item = await MenuItem.findById(req.params.id);

        if (!item) {
            return res.status(404).json({ message: 'Menu item not found' });
        }

        if (name) item.name = name.trim();
        if (category) item.category = category.trim();
        if (price !== undefined) item.price = Number(price);
        if (imageUrl !== undefined) item.imageUrl = imageUrl.trim() || item.imageUrl;
        if (isVeg !== undefined) item.isVeg = Boolean(isVeg);
        if (description !== undefined) item.description = description.trim();
        if (isAvailable !== undefined) item.isAvailable = Boolean(isAvailable);

        if (ingredients !== undefined) {
            item.ingredients = (ingredients || []).filter(ing => {
                const id = ing.ingredientId?._id || ing.ingredientId;
                return id && typeof id === 'string' && id.trim().length === 24;
            }).map(ing => ({
                ingredientId: ing.ingredientId?._id || ing.ingredientId,
                quantityRequired: Number(ing.quantityRequired) || 0
            }));
        }

        const updatedItem = await item.save();
        res.json(updatedItem);
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ message: error.message || 'Error updating menu item' });
    }
};

// @desc    Delete a Menu Item
// @route   DELETE /api/menu/:id
const deleteMenuItem = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id);

        if (item) {
            await item.deleteOne();
            res.json({ message: 'Menu item removed' });
        } else {
            res.status(404).json({ message: 'Menu item not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting menu item', error: error.message });
        console.error(error);
    }
};

module.exports = { getMenuItems, seedMenu, addMenuItem, updateMenuItem, deleteMenuItem };
