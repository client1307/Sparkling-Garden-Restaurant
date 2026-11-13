const express = require('express');
const router = express.Router();
const Table = require('../models/Table');
const { protect, adminOnly, authorize } = require('../middleware/authMiddleware');
const { capabilityForTable } = require('../utils/tableCapability');

// @desc    Get all tables (Staff access)
// @route   GET /api/tables
router.get('/', protect, authorize('admin', 'waiter', 'billing'), async (req, res) => {
    try {
        let tables = await Table.find({ isActive: true, tableId: { $ne: 13 } }).sort({ tableId: 1 });
        if (tables.length < 32) {
            for (let i = 1; i <= 33; i++) {
                if (i === 13) {
                    await Table.deleteMany({ tableId: 13 });
                    continue;
                }
                await Table.findOneAndUpdate(
                    { tableId: i },
                    { tableId: i, capacity: i <= 6 ? 4 : 6, isActive: true, status: 'available' },
                    { upsert: true, new: true }
                );
            }
            tables = await Table.find({ isActive: true, tableId: { $ne: 13 } }).sort({ tableId: 1 });
        }
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get table status by tableId number
// @route   GET /api/tables/status/:tableId
router.get('/status/:tableId', async (req, res) => {
    try {
        const table = await Table.findOne({ tableId: req.params.tableId, isActive: true });
        if (!table) {
            return res.status(404).json({ message: 'Table not found', exists: false });
        }
        res.json({
            exists: true,
            status: table.status,
            tableId: table.tableId,
            currentBill: table.currentBill || 0,
            tableToken: capabilityForTable(table.tableId)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Add a new table (Admin only)
// @route   POST /api/tables
router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const { tableId, capacity } = req.body;
        const parsedTableId = parseInt(tableId, 10);
        const parsedCapacity = parseInt(capacity, 10);

        if (isNaN(parsedTableId) || parsedTableId <= 0) {
            return res.status(400).json({ message: 'Valid positive tableId is required' });
        }

        const table = new Table({
            tableId: parsedTableId,
            capacity: !isNaN(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : 4
        });
        const savedTable = await table.save();
        res.status(201).json(savedTable);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Update table status/capacity (Staff only, mass assignment protected)
// @route   PATCH /api/tables/:id
router.patch('/:id', protect, authorize('admin', 'waiter'), async (req, res) => {
    try {
        const { status, capacity } = req.body;
        const updateData = {};

        if (status) {
            const allowedStatuses = ['available', 'occupied', 'cleaning', 'billing'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
            }
            updateData.status = status;
            if (status === 'available') {
                updateData.currentBill = 0;
                updateData.sessionStart = null;
            }
        }

        if (capacity !== undefined) {
            const parsedCapacity = parseInt(capacity, 10);
            if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
                return res.status(400).json({ message: 'Capacity must be a positive number' });
            }
            updateData.capacity = parsedCapacity;
        }

        const table = await Table.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json(table);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// @desc    Soft delete table (Admin only)
// @route   DELETE /api/tables/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
    try {
        const table = await Table.findByIdAndUpdate(req.params.id, { isActive: false });
        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }
        res.json({ message: 'Table removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
