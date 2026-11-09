const express = require('express');
const router = express.Router();
const {
    getOverviewStats,
    getEmployees,
    createEmployee,
    updateEmployee,
    toggleEmployeeStatus,
    deleteEmployee,
    getBills,
    getDiscounts,
    getSettings,
    updateSettings,
    testPrinter,
    getAuditLogs,
    getSyncStatus,
    getDatabaseBackup,
    restoreDatabase
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// All admin routes strictly require valid JWT and admin role
router.use(protect, adminOnly);

// Overview
router.get('/overview', getOverviewStats);

// Employees & Roles
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.patch('/employees/:id/toggle-status', toggleEmployeeStatus);
router.delete('/employees/:id', deleteEmployee);

// Bills & Discounts
router.get('/bills', getBills);
router.get('/discounts', getDiscounts);

// Settings & Printers
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/printer/test', testPrinter);

// Audit & Sync
router.get('/audit-logs', getAuditLogs);
router.get('/sync-status', getSyncStatus);

// Backup & Recovery
router.get('/backup', getDatabaseBackup);
router.post('/restore', restoreDatabase);

module.exports = router;

