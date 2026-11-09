const mongoose = require('mongoose');
const s = new mongoose.Schema({
  type: { type: String, enum: ['kitchen', 'cancel', 'bill'], required: true },
  printer: { type: String, enum: ['kitchen', 'bill'], required: true },
  tableNumber: Number,
  lines: [{ t: String, big: Boolean, align: String }],
  status: { type: String, enum: ['pending', 'printing', 'printed', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });
s.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
module.exports = mongoose.model('PrintJob', s);
