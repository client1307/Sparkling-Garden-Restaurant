const express = require('express');
const router = express.Router();
const { generateDailyReport, generateMonthlyReport, exportOrders, generateCustomerBill, generateTableBill } = require('../controllers/reportController');
const { protect, adminOnly, authorize } = require('../middleware/authMiddleware');
const { isValidTableCapability } = require('../utils/tableCapability');
const Order = require('../models/Order');

// Administrative business reports
router.get('/daily', protect, adminOnly, generateDailyReport);
router.get('/monthly', protect, adminOnly, generateMonthlyReport);
router.get('/export', protect, adminOnly, exportOrders);

// Customer & Staff billing generation
router.get('/bill/:id', protect, authorize('admin', 'waiter', 'billing'), generateCustomerBill);
router.get('/bill/table/:tableId', async (req, res, next) => {
    const tableId = parseInt(req.params.tableId, 10);
    const tableToken = req.get('x-table-token');
    if (isValidTableCapability(tableId, tableToken)) {
        return next();
    }
    const token = req.get('x-guest-token');
    if (token && /^[a-f0-9]{64}$/i.test(token)) {
        const hasAccess = await Order.exists({ tableNumber: tableId, guestAccessToken: token });
        if (hasAccess) {
            req.guestAccessToken = token;
            return next();
        }
    }
    return protect(req, res, () => authorize('admin', 'waiter', 'billing')(req, res, next));
}, generateTableBill);

module.exports = router;
