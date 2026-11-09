const User = require('../models/User');
const Order = require('../models/Order');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Inventory = require('../models/Inventory');
const PrintJob = require('../models/PrintJob');
const ActivityLog = require('../models/ActivityLog');
const RestaurantSetting = require('../models/RestaurantSetting');

// Default permissions map by role
const ROLE_PERMISSIONS = {
    admin: ['all', 'manage_staff', 'manage_menu', 'manage_tables', 'settle_bills', 'apply_discounts', 'view_reports', 'manage_settings', 'audit_logs'],
    billing: ['settle_bills', 'apply_discounts', 'edit_bill_items', 'print_receipts', 'view_tables'],
    waiter: ['create_orders', 'edit_orders', 'view_tables', 'request_cancel', 'request_billing'],
    kitchen: ['view_tickets', 'reprint_tickets', 'mark_preparing', 'mark_ready']
};

// @desc    A02: Executive Restaurant-wide Overview
// @route   GET /api/admin/overview
const getOverviewStats = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);

        const [
            todayOrders,
            allTables,
            monthOrders,
            lowStockCount,
            activeStaffCount,
            pendingPrintJobs,
            recentLogs
        ] = await Promise.all([
            Order.find({ createdAt: { $gte: startOfToday } }).lean(),
            Table.find({}).lean(),
            Order.find({ createdAt: { $gte: startOfMonth }, status: 'Paid' }).lean(),
            Inventory.countDocuments({ $expr: { $lte: ['$currentStock', '$minStock'] } }),
            User.countDocuments({ isActive: { $ne: false } }),
            PrintJob.countDocuments({ status: { $in: ['queued', 'failed'] } }),
            ActivityLog.find().sort({ timestamp: -1 }).limit(10).lean()
        ]);

        const todayPaid = todayOrders.filter(o => o.status === 'Paid');
        const todayRevenue = todayPaid.reduce((sum, o) => sum + (o.total || 0), 0);
        const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        const occupiedTables = allTables.filter(t => t.status === 'occupied' || t.status === 'billing');
        const billingRequested = allTables.filter(t => t.status === 'billing');

        const activeOrderCount = todayOrders.filter(o => ['Pending', 'Preparing', 'Ready', 'Served'].includes(o.status)).length;

        res.json({
            todayRevenue,
            monthRevenue,
            todayOrderCount: todayOrders.length,
            todayPaidCount: todayPaid.length,
            activeOrderCount,
            occupiedTablesCount: occupiedTables.length,
            billingRequestedCount: billingRequested.length,
            totalTables: allTables.length || 32,
            lowStockCount,
            activeStaffCount,
            pendingPrintJobs,
            recentLogs
        });
    } catch (error) {
        console.error('Error fetching admin overview:', error);
        res.status(500).json({ message: 'Failed to fetch overview stats', error: error.message });
    }
};

// @desc    A10, A11, A12: Employee & Role Management
// @route   GET /api/admin/employees
const getEmployees = async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch employees', error: error.message });
    }
};

// @route   POST /api/admin/employees
const createEmployee = async (req, res) => {
    try {
        const { name, email, password, role, phone, permissions } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: 'Name, email, password, and role are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const userPermissions = Array.isArray(permissions) && permissions.length > 0 
            ? permissions 
            : (ROLE_PERMISSIONS[role] || []);

        const newUser = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password,
            role,
            phone: phone || '',
            permissions: userPermissions,
            isActive: true
        });

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: `Created new staff account (${newUser.name} - ${newUser.role})`,
            entityType: 'User',
            entityId: newUser._id.toString()
        });

        const sanitized = await User.findById(newUser._id).select('-password');
        res.status(201).json(sanitized);
    } catch (error) {
        console.error('Error creating employee:', error);
        res.status(500).json({ message: error.message || 'Failed to create employee' });
    }
};

// @route   PUT /api/admin/employees/:id
const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, phone, permissions, isActive, password } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (name) user.name = name.trim();
        if (email) user.email = email.trim().toLowerCase();
        if (role) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (permissions) user.permissions = permissions;
        if (isActive !== undefined) user.isActive = Boolean(isActive);
        if (password && password.trim().length >= 6) {
            user.password = password.trim();
        }

        await user.save();

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: `Updated staff account (${user.name} - ${user.role})`,
            entityType: 'User',
            entityId: user._id.toString()
        });

        const sanitized = await User.findById(user._id).select('-password');
        res.json(sanitized);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update employee', error: error.message });
    }
};

// @route   PATCH /api/admin/employees/:id/toggle-status
const toggleEmployeeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'Employee not found' });

        // Prevent deactivating self if admin
        if (req.user?._id?.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        await user.save();

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: `${user.isActive ? 'Activated' : 'Deactivated'} employee ${user.name}`,
            entityType: 'User',
            entityId: user._id.toString()
        });

        res.json({ message: `Employee status changed to ${user.isActive ? 'Active' : 'Inactive'}`, isActive: user.isActive });
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle status', error: error.message });
    }
};

// @route   DELETE /api/admin/employees/:id
const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user?._id?.toString() === id) {
            return res.status(400).json({ message: 'Cannot delete logged-in admin' });
        }
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: 'Employee not found' });

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: `Deleted employee ${user.name}`,
            entityType: 'User',
            entityId: id
        });

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete employee', error: error.message });
    }
};

// @desc    A14: Bill Monitoring (All Bills)
// @route   GET /api/admin/bills
const getBills = async (req, res) => {
    try {
        const { status, date, tableId } = req.query;
        let query = {};

        if (status) query.status = status;
        if (tableId) query.tableId = Number(tableId);
        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.createdAt = { $gte: start, $lte: end };
        }

        const bills = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(150)
            .lean();

        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch bills', error: error.message });
    }
};

// @desc    A15: Discount Monitoring
// @route   GET /api/admin/discounts
const getDiscounts = async (req, res) => {
    try {
        const ordersWithDiscounts = await Order.find({
            discountAmount: { $gt: 0 }
        })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        const auditDiscounts = await ActivityLog.find({
            action: { $regex: /discount/i }
        })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        const totalDiscountGiven = ordersWithDiscounts.reduce((sum, o) => sum + (o.discountAmount || 0), 0);

        res.json({
            totalDiscountGiven,
            count: ordersWithDiscounts.length,
            records: ordersWithDiscounts,
            auditTrail: auditDiscounts
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch discounts', error: error.message });
    }
};

// @desc    A18, A19: System & Printer Settings
// @route   GET /api/admin/settings
const getSettings = async (req, res) => {
    try {
        const settings = await RestaurantSetting.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to load settings', error: error.message });
    }
};

// @route   PUT /api/admin/settings
const updateSettings = async (req, res) => {
    try {
        let settings = await RestaurantSetting.getSettings();
        Object.assign(settings, req.body);
        await settings.save();

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: 'Updated Restaurant & Printer Configuration',
            entityType: 'System'
        });

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update settings', error: error.message });
    }
};

// @desc    A18: Test Printer Dispatch
// @route   POST /api/admin/printer/test
const testPrinter = async (req, res) => {
    try {
        const { target } = req.body; // 'kitchen' or 'billing'
        const settings = await RestaurantSetting.getSettings();

        const printerName = target === 'billing' 
            ? settings.billingPrinter.name 
            : settings.kitchenPrinter.name;

        const testLines = [
            '================================',
            '      THE SPARKLING GARDEN      ',
            `  TEST PRINT - ${target.toUpperCase()} PRINTER  `,
            '================================',
            `Time: ${new Date().toLocaleTimeString('en-IN')}`,
            `Paper Width: ${target === 'billing' ? settings.billingPrinter.paperWidth : settings.kitchenPrinter.paperWidth}`,
            'Status: OK - Thermal Printer Ready',
            '================================'
        ];

        const job = await PrintJob.create({
            target: target || 'kitchen',
            title: `Test Print (${target})`,
            lines: testLines,
            status: 'queued'
        });

        const io = req.app.get('socketio');
        if (io) io.emit('print_job', job);

        res.json({ message: `Test print queued for ${printerName}`, jobId: job._id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to queue test print', error: error.message });
    }
};

// @desc    A20: Audit Logs
// @route   GET /api/admin/audit-logs
const getAuditLogs = async (req, res) => {
    try {
        const { role, entityType, limit = 100 } = req.query;
        let query = {};
        if (role) query.role = role;
        if (entityType) query.entityType = entityType;

        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .limit(Number(limit))
            .lean();

        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch audit logs', error: error.message });
    }
};

// @desc    A21: Offline Synchronization Status
// @route   GET /api/admin/sync-status
const getSyncStatus = async (req, res) => {
    try {
        const queuedJobs = await PrintJob.find({ status: { $in: ['queued', 'failed'] } }).sort({ createdAt: -1 }).limit(20);
        const lastActivity = await ActivityLog.findOne().sort({ timestamp: -1 });

        res.json({
            isOnline: true,
            pendingPrintJobsCount: queuedJobs.filter(j => j.status === 'queued').length,
            failedPrintJobsCount: queuedJobs.filter(j => j.status === 'failed').length,
            recentPendingJobs: queuedJobs,
            lastSyncedAt: lastActivity ? lastActivity.timestamp : new Date(),
            serverTime: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch sync status', error: error.message });
    }
};

// @desc    A22: Backup Database (Export JSON Dump)
// @route   GET /api/admin/backup
const getDatabaseBackup = async (req, res) => {
    try {
        const [
            users,
            menuItems,
            tables,
            orders,
            settings,
            activityLogs
        ] = await Promise.all([
            User.find({}).select('-password').lean(),
            MenuItem.find({}).lean(),
            Table.find({}).lean(),
            Order.find({}).sort({ createdAt: -1 }).limit(500).lean(),
            RestaurantSetting.findOne().lean(),
            ActivityLog.find({}).sort({ timestamp: -1 }).limit(200).lean()
        ]);

        const backupData = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            restaurant: settings?.restaurantName || 'The Sparkling Garden Restaurant',
            counts: {
                users: users.length,
                menuItems: menuItems.length,
                tables: tables.length,
                orders: orders.length,
                activityLogs: activityLogs.length
            },
            data: {
                users,
                menuItems,
                tables,
                orders,
                settings,
                activityLogs
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="sparkling-db-backup-${new Date().toISOString().slice(0, 10)}.json"`);
        res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
        console.error('Database backup error:', error);
        res.status(500).json({ message: 'Backup generation failed', error: error.message });
    }
};

// @desc    A22: Restore Database from JSON
// @route   POST /api/admin/restore
const restoreDatabase = async (req, res) => {
    try {
        const { backup } = req.body;
        if (!backup || !backup.data) {
            return res.status(400).json({ message: 'Invalid backup file format' });
        }

        const { menuItems, settings } = backup.data;

        let restoredItems = 0;
        if (Array.isArray(menuItems) && menuItems.length > 0) {
            for (const item of menuItems) {
                if (item.name && item.category && item.price) {
                    await MenuItem.findOneAndUpdate(
                        { name: item.name },
                        { $set: item },
                        { upsert: true, new: true }
                    );
                    restoredItems++;
                }
            }
        }

        if (settings) {
            await RestaurantSetting.findOneAndUpdate({}, { $set: settings }, { upsert: true });
        }

        await ActivityLog.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Admin',
            role: req.user?.role || 'admin',
            action: `Restored Database Backup (${restoredItems} menu items synchronized)`,
            entityType: 'System'
        });

        res.json({ message: `Backup restored successfully! ${restoredItems} menu items processed.` });
    } catch (error) {
        console.error('Database restore error:', error);
        res.status(500).json({ message: 'Failed to restore database', error: error.message });
    }
};

module.exports = {
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
};

