const mongoose = require('mongoose');
const Order = require('../models/Order');
const Inventory = require('../models/Inventory');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');

const { deductInventoryForOrder } = require('../utils/inventoryManager');

// @desc    Create new order with server-calculated total
// @route   POST /api/orders
const createOrder = async (req, res) => {
    const { tableNumber, items, tip } = req.body || {};

    const tableNum = parseInt(tableNumber, 10);
    if (isNaN(tableNum) || tableNum <= 0) {
        return res.status(400).json({ message: 'Valid positive table number is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'No items in order' });
    }

    try {
        // 1. Batch fetch all menu items in ONE query to avoid sequential network round-trips
        const itemIds = items.map(i => i.menuItemId || i.menuItem).filter(id => id && mongoose.Types.ObjectId.isValid(id));
        const itemNames = items.map(i => i.name).filter(Boolean);

        const queryOr = [];
        if (itemIds.length > 0) queryOr.push({ _id: { $in: itemIds } });
        if (itemNames.length > 0) queryOr.push({ name: { $in: itemNames } });

        const menuItemsDocs = queryOr.length > 0 ? await MenuItem.find({ $or: queryOr }).lean() : [];
        const itemMapById = new Map(menuItemsDocs.map(d => [d._id.toString(), d]));
        const itemMapByName = new Map(menuItemsDocs.map(d => [d.name.toLowerCase().trim(), d]));

        // Verify items and calculate server-side pricing
        const verifiedItems = [];
        let subtotal = 0;

        for (const item of items) {
            const quantity = parseInt(item.quantity, 10);
            if (isNaN(quantity) || quantity <= 0) {
                return res.status(400).json({ message: `Invalid quantity for item ${item.name || 'unnamed'}` });
            }

            const itemId = item.menuItemId || item.menuItem;
            const menuItemDoc = (itemId && itemMapById.get(itemId.toString())) || 
                                (item.name && itemMapByName.get(item.name.toLowerCase().trim()));

            if (!menuItemDoc) {
                return res.status(400).json({ message: `Item not found on active menu: ${item.name || itemId}` });
            }

            const price = Number(menuItemDoc.price);
            if (isNaN(price) || price < 0) {
                return res.status(400).json({ message: `Invalid menu pricing configured for ${menuItemDoc.name}` });
            }

            verifiedItems.push({
                menuItem: menuItemDoc._id.toString(),
                name: menuItemDoc.name,
                quantity,
                price
            });

            subtotal += price * quantity;
        }

        // Standard 5% GST tax calculation
        const tax = subtotal * 0.05;
        const verifiedTip = (typeof tip === 'number' && tip >= 0) ? Number(tip) : 0;
        const serverTotalAmount = Number((subtotal + tax + verifiedTip).toFixed(2));

        // 1. HARD SAFETY CHECK & INVENTORY DEDUCTION (Atomic-like)
        // This will throw if stock is insufficient, preventing the order.
        await deductInventoryForOrder(verifiedItems);

        const order = new Order({
            tableNumber: tableNum,
            items: verifiedItems,
            totalAmount: serverTotalAmount,
            tip: verifiedTip,
            status: 'Pending'
        });

        const createdOrder = await order.save();

        // 3. Update Table Status
        try {
            const table = await Table.findOne({ tableId: tableNum });
            if (table) {
                table.status = 'occupied';
                table.currentBill = (table.currentBill || 0) + serverTotalAmount;
                if (!table.sessionStart) table.sessionStart = new Date();
                await table.save();
            }
        } catch (tableErr) {
            console.error(`[Order] Failed to update table status: ${tableErr.message}`);
        }

        // 4. Emit Socket Events
        const io = req.app.get('socketio');
        if (io) {
            io.emit('new_order', createdOrder);
            io.emit('table_update', { tableId: tableNum });
            io.emit('menu_updated');
        }

        res.status(201).json(createdOrder);

    } catch (error) {
        console.error(`[Order] Failed to create order: ${error.message}`);
        if (error.message.includes('Insufficient stock')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error processing order' });
    }
};

// @desc    Get active orders only (history disabled)
// @route   GET /api/orders
const getOrders = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const filter = {
            createdAt: { $gte: todayStart },
            status: { $nin: ['Paid', 'Cancelled'] }
        };

        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update Order Status
// @route   PUT /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    // In real auth, we'd get this from req.user
    const currentRole = 'Kitchen';

    try {
        const order = await Order.findById(id);

        if (order) {
            order.status = status;
            const updatedOrder = await order.save();

            // If Paid → auto-reset table to available
            if (status === 'Paid') {
                try {
                    const table = await Table.findOne({ tableId: order.tableNumber });
                    if (table) {
                        // Check if there are other active orders for this table
                        const otherActive = await Order.countDocuments({
                            tableNumber: order.tableNumber,
                            status: { $nin: ['Paid', 'Cancelled'] },
                            _id: { $ne: order._id }
                        });
                        if (otherActive === 0) {
                            table.status = 'available';
                            table.currentBill = 0;
                            table.sessionStart = null;
                            await table.save();
                            console.log(`[Order] Table ${order.tableNumber} auto-reset to available (bill paid)`);
                        }
                    }
                } catch (tableErr) {
                    console.error(`[Order] Failed to reset table: ${tableErr.message}`);
                }
            }

            // Emit Socket Events to ALL screens
            const io = req.app.get('socketio');
            io.emit('order_status_update', updatedOrder);  // Kitchen, Customer, Admin, Waiter
            io.emit('table_update', { tableId: order.tableNumber }); // Waiter Dashboard tables

            // Only remove CANCELLED orders — Paid orders must stay in DB for analytics & revenue tracking.
            if (status === 'Cancelled') {
                await Order.deleteOne({ _id: order._id });
            }

            res.json(updatedOrder);
        } else {
            console.log(`[Backend] Order ${id} not found`);
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        console.error(`[Backend] Error updating order: ${error.message}`);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Mark all active orders for a table as Paid & reset table
// @route   PUT /api/orders/table/:tableId/mark-paid
const markTablePaid = async (req, res) => {
    const { tableId } = req.params;

    try {
        // 1. Find all active (non-paid) orders for this table
        const activeOrders = await Order.find({
            tableNumber: tableId,
            status: { $nin: ['Paid', 'Cancelled'] }
        });

        if (activeOrders.length === 0) {
            // No active orders, just reset the table
            const table = await Table.findOne({ tableId });
            if (table) {
                table.status = 'available';
                table.currentBill = 0;
                table.sessionStart = null;
                await table.save();
            }

            const io = req.app.get('socketio');
            io.emit('table_update', { tableId });
            return res.json({ message: 'Table cleared (no active orders)', updatedOrders: [] });
        }

        // 2. Mark all active orders as Paid
        const updatedOrders = [];
        for (const order of activeOrders) {
            order.status = 'Paid';
            order.paymentMode = req.body.paymentMode || 'Cash';
            await order.save();
            updatedOrders.push(order);
        }

        // NOTE: Paid orders are KEPT in the database for analytics & revenue tracking.
        // Only Cancelled orders should be removed. Do NOT deleteMany here.

        // 3. Reset table to available
        const table = await Table.findOne({ tableId });
        if (table) {
            table.status = 'available';
            table.currentBill = 0;
            table.sessionStart = null;
            await table.save();
        }

        // 4. Emit socket events for ALL screens to update
        const io = req.app.get('socketio');
        updatedOrders.forEach(order => {
            io.emit('order_status_update', order);
        });
        io.emit('table_update', { tableId });

        res.json({
            message: `${updatedOrders.length} order(s) marked as Paid for Table ${tableId}`,
            updatedOrders
        });
    } catch (error) {
        console.error(`[Waiter] Failed to mark table ${tableId} as paid:`, error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get active orders & consolidated bill for a specific table (Guest accessible)
// @route   GET /api/orders/table/:tableId/active
const getTableActiveOrders = async (req, res) => {
    try {
        const tableId = parseInt(req.params.tableId, 10);
        if (isNaN(tableId)) {
            return res.status(400).json({ message: 'Valid table number is required' });
        }

        const orders = await Order.find({
            tableNumber: tableId,
            status: { $nin: ['Cancelled'] }
        }).sort({ createdAt: -1 });

        // Filter active (non-paid) or most recent session
        const activeOrders = orders.filter(o => o.status !== 'Paid');
        const displayOrders = activeOrders.length > 0 ? activeOrders : orders.slice(0, 1);

        if (displayOrders.length === 0) {
            return res.json({
                hasActiveOrder: false,
                tableNumber: tableId,
                orders: [],
                items: [],
                subtotal: 0,
                tax: 0,
                totalAmount: 0
            });
        }

        // Consolidated item list
        const itemMap = {};
        let subtotal = 0;
        let totalAmount = 0;

        displayOrders.forEach(order => {
            totalAmount += Number(order.totalAmount) || 0;
            (order.items || []).forEach(item => {
                const key = item.name;
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                subtotal += (qty * price);

                if (!itemMap[key]) {
                    itemMap[key] = {
                        name: item.name,
                        quantity: 0,
                        price: price,
                        total: 0
                    };
                }
                itemMap[key].quantity += qty;
                itemMap[key].total += (qty * price);
            });
        });

        const tax = subtotal * 0.05;

        res.json({
            hasActiveOrder: true,
            tableNumber: tableId,
            orders: displayOrders,
            latestStatus: displayOrders[0]?.status || 'Pending',
            items: Object.values(itemMap),
            subtotal: Number(subtotal.toFixed(2)),
            tax: Number(tax.toFixed(2)),
            totalAmount: Number((totalAmount || (subtotal + tax)).toFixed(2)),
            orderCount: displayOrders.length,
            latestOrderId: displayOrders[0]?._id
        });
    } catch (error) {
        console.error("Error fetching table active orders:", error);
        res.status(500).json({ message: "Failed to retrieve table orders" });
    }
};

module.exports = { createOrder, getOrders, updateOrderStatus, markTablePaid, getTableActiveOrders };
