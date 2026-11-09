const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    tableId: { type: Number, required: true, unique: true, validate: { validator: v => Number.isInteger(v) && v >= 1 && v <= 33 && v !== 13, message: 'Table 13 does not exist; tables are 1-33 except 13' } },
    customerName: { type: String, default: '' },
    customerMobile: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'flat'], default: 'flat' },
    discountValue: { type: Number, default: 0 },
    capacity: { type: Number, required: true, default: 4 },
    section: { type: String, default: 'Common Hall' },
    status: { type: String, enum: ['available', 'occupied', 'cleaning', 'billing'], default: 'available' },
    currentBill: { type: Number, default: 0 },
    sessionStart: { type: Date },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
