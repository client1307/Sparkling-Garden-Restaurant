const express = require('express');
const router = express.Router();
const { 
    getMenuItems, 
    seedMenu, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem,
    getCategories,
    renameCategory,
    deleteCategory
} = require('../controllers/menuController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public access for digital menu browsing
router.get('/', getMenuItems);
router.get('/categories', getCategories);

// Admin-only management
router.post('/', protect, adminOnly, addMenuItem);
router.put('/categories', protect, adminOnly, renameCategory);
router.delete('/categories/:name', protect, adminOnly, deleteCategory);
router.put('/:id', protect, adminOnly, updateMenuItem);
router.delete('/:id', protect, adminOnly, deleteMenuItem);
router.post('/seed', protect, adminOnly, seedMenu);

module.exports = router;
