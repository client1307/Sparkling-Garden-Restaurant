const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: '' },
    role: {
        type: String,
        enum: ['admin', 'waiter', 'billing', 'kitchen', 'customer'],
        default: 'customer'
    },
    isActive: { type: Boolean, default: true },
    permissions: [{ type: String }] // e.g. ['take_orders', 'settle_bills', 'apply_discounts', 'edit_menu', 'view_reports', 'manage_staff', 'manage_tables']
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
