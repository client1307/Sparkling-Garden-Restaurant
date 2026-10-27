const express = require('express');
const { createOrder, getOrders, updateOrderStatus, markTablePaid, getTableActiveOrders } = require('../controllers/orderController');
const { protect, adminOnly, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Customer/Guest table ordering is public; viewing orders requires staff auth
router.route('/')
    .post(createOrder)
    .get(protect, authorize('admin', 'kitchen', 'waiter'), getOrders);

// Customer/Guest active bill and orders
router.get('/table/:tableId/active', getTableActiveOrders);

// Kitchen & Staff can update order status
router.route('/:id/status')
    .put(protect, authorize('admin', 'kitchen', 'waiter'), updateOrderStatus);

// Waiter & Admin can mark table paid
router.route('/table/:tableId/mark-paid')
    .put(protect, authorize('admin', 'waiter'), markTablePaid);

module.exports = router;
