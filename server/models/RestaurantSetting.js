const mongoose = require('mongoose');

const restaurantSettingSchema = new mongoose.Schema({
    restaurantName: { type: String, default: 'SPARKLING' },
    tagline: { type: String, default: 'GARDEN RESTAURANT' },
    address: { type: String, default: 'At. & Po.Rasana Mota, Palanpur Highway,Deesa- 385535' },
    phone: { type: String, default: '+91 94093 22022' },
    email: { type: String, default: 'thesparkling2018@gmail.com' },
    gstNumber: { type: String, default: '24BRUPP4641N1Z0' },
    hsnCode: { type: String, default: '996334' },
    fssaiLicense: { type: String, default: '11522000000001' },
    jurisdiction: { type: String, default: 'Subject to Deesa jurisdiction only' },
    cgstPercent: { type: Number, default: 2.5 },
    sgstPercent: { type: Number, default: 2.5 },
    serviceChargePercent: { type: Number, default: 0 },
    managerPin: { type: String, default: '9999' },
    currencySymbol: { type: String, default: '₹' },

    // A18 Printer settings
    kitchenPrinter: {
        enabled: { type: Boolean, default: true },
        name: { type: String, default: 'Kitchen Thermal Printer' },
        type: { type: String, default: 'network', enum: ['network', 'usb', 'bluetooth'] },
        ip: { type: String, default: '192.168.1.200' },
        port: { type: Number, default: 9100 },
        paperWidth: { type: String, default: '80mm', enum: ['58mm', '80mm'] },
        autoPrintOrders: { type: Boolean, default: true },
        autoPrintCancellations: { type: Boolean, default: true }
    },
    billingPrinter: {
        enabled: { type: Boolean, default: true },
        name: { type: String, default: 'Billing Desk Thermal Printer' },
        type: { type: String, default: 'network', enum: ['network', 'usb', 'bluetooth'] },
        ip: { type: String, default: '192.168.1.201' },
        port: { type: Number, default: 9100 },
        paperWidth: { type: String, default: '80mm', enum: ['58mm', '80mm'] },
        autoPrintInvoice: { type: Boolean, default: true }
    }
}, { timestamps: true });

// Ensure single record
restaurantSettingSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('RestaurantSetting', restaurantSettingSchema);

