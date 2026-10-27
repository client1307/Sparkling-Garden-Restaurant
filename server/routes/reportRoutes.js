const express = require('express');
const router = express.Router();
const { generateDailyReport, generateMonthlyReport, exportOrders, generateCustomerBill, generateTableBill } = require('../controllers/reportController');
const { protect, adminOnly, authorize } = require('../middleware/authMiddleware');

// Administrative business reports
router.get('/daily', protect, adminOnly, generateDailyReport);
router.get('/monthly', protect, adminOnly, generateMonthlyReport);
router.get('/export', protect, adminOnly, exportOrders);

// Customer & Staff billing generation
router.get('/bill/:id', generateCustomerBill);
router.get('/bill/table/:tableId', generateTableBill);

module.exports = router;
