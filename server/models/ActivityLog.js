const mongoose = require('mongoose');

const activityLogSchema = mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    role: { type: String }, // admin, billing, waiter, kitchen
    action: { type: String, required: true }, // e.g., "Updated Menu", "Accepted Order", "Discount Authorized"
    entityType: { type: String }, // Order, Bill, Menu, Table, User, System, Printer
    entityId: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
