const crypto = require('crypto');

const capabilityForTable = (tableId) => crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`table:${tableId}`)
    .digest('hex');

const isValidTableCapability = (tableId, token) => {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return false;
    return crypto.timingSafeEqual(
        Buffer.from(capabilityForTable(tableId), 'hex'),
        Buffer.from(token, 'hex')
    );
};

module.exports = { capabilityForTable, isValidTableCapability };
