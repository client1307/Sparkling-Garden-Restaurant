const express = require('express');
const { createOrder, getOrders, updateOrderStatus, markTablePaid, getTableActiveOrders } = require('../controllers/orderController');
const { protect, adminOnly, authorize } = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimit');
const { isValidTableCapability } = require('../utils/tableCapability');

const { placeOrder } = require('../controllers/specController');
const router = express.Router();

const guestAccess = async (req, res, next) => {
    const guestToken = req.get('x-guest-token');
    const tableToken = req.get('x-table-token');
    const tableId = parseInt(req.params.tableId, 10);

    const isTableValid = isValidTableCapability(tableId, tableToken);
    const isGuestValid = guestToken && /^[a-f0-9]{64}$/i.test(guestToken);

    if (!isTableValid && !isGuestValid) {
        return res.status(401).json({ message: 'Guest access token or valid table token required' });
    }
    if (isGuestValid) {
        req.guestAccessToken = guestToken;
    }
    next();
};

// Customer/Guest table ordering is public; viewing orders requires staff auth
router.route('/')
    .post(rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many order attempts' }), (req, res, next) => {
        if (!isValidTableCapability(req.body?.tableNumber, req.get('x-table-token'))) {
            return res.status(403).json({ message: 'Valid table QR token required' });
        }
        next();
    }, placeOrder('guest'))
    .get(protect, authorize('admin', 'kitchen', 'waiter'), getOrders);

// Customer/Guest active bill and orders
router.get('/table/:tableId/active', guestAccess, getTableActiveOrders);

// Kitchen & Staff can update order status
router.route('/:id/status')
    .put(protect, authorize('admin', 'kitchen', 'waiter', 'billing'), updateOrderStatus);

// Billing Desk & Admin can mark table paid (Waiters cannot settle bills)
router.route('/table/:tableId/mark-paid')
    .put(protect, authorize('admin', 'billing'), markTablePaid);

module.exports = router;
