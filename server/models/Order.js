const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    tableNumber: { type: Number, required: true },
    items: [{
        menuItem: { type: String }, // Changed from ObjectId to String to support Mock IDs
        name: { type: String },
        quantity: { type: Number, required: true },
        status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
        price: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Preparing', 'Ready', 'Served', 'Paid', 'Cancelled'],
        default: 'Pending'
    },
    tip: { type: Number, default: 0 },
    customerName: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    guestAccessToken: { type: String, select: false },
    source: { type: String, enum: ['guest', 'waiter'], default: 'guest' },
    waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    waiterName: { type: String, default: '' },
    isAddOn: { type: Boolean, default: false },
    paymentMode: { type: String, enum: ['Cash', 'Pending'], default: 'Pending' },
    estimatedPrepTime: { type: Number, default: 15 } // In Minutes
}, { timestamps: true });

// History is kept for 4 months (120 days), then MongoDB deletes it automatically
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 * 24 * 3600 });

module.exports = mongoose.model('Order', orderSchema);
