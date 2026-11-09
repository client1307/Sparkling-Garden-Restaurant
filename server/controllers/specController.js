// Spec layer: guest/waiter ordering, kitchen + bill receipts, billing desk logic.
const mongoose = require('mongoose');
const crypto = require('crypto');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');
const PrintJob = require('../models/PrintJob');

const time = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const time12h = () => new Date().toLocaleTimeString('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const padHeader = (left, right, width = 32) => {
  const l = String(left || '');
  const r = String(right || '');
  const spaces = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(spaces) + r;
};

const centerText = (text, width = 32) => {
  const t = String(text || '').trim();
  if (t.length >= width) return t;
  const leftPad = Math.floor((width - t.length) / 2);
  return ' '.repeat(leftPad) + t;
};

const emit = (req, ev, d = {}) => { const io = req.app.get('socketio'); if (io) io.to('staff').emit(ev, d); };

const queue = async (req, type, printer, tableNumber, lines) => {
  const job = await PrintJob.create({ type, printer, tableNumber, lines });
  emit(req, 'print_job', { id: job._id });
};

// Formatted thermal receipt lines matching physical 58mm/80mm ticket
const kitchenLines = (tableNumber, items, addOn = false, options = {}) => {
  const section = options.section || 'Common Hall';
  const userName = options.userName || (options.source === 'waiter' ? 'waiter' : options.source === 'guest' ? 'guest' : 'admin');
  const waiterName = options.waiterName || options.customerName || 'Staff';
  const timeStr = time12h();

  return [
    { t: centerText(section), align: 'center' },
    { t: centerText(addOn ? `Table: ${tableNumber} (ADD-ON)` : `Table: ${tableNumber}`), big: true, align: 'center' },
    { t: `USER:${userName}` },
    { t: '--------------------------------' },
    { t: `Waiter Name : ${waiterName}` },
    { t: '--------------------------------' },
    { t: padHeader('QTY  ITEM', timeStr) },
    { t: '--------------------------------' },
    ...items.map(i => {
      const q = String(i.quantity).padStart(2, ' ');
      const name = String(i.name || '').toUpperCase();
      return { t: `${q}   ${name}` };
    }),
    { t: '--------------------------------' }
  ];
};

const cancelKitchenLines = (tableNumber, removedItems, options = {}) => {
  const section = options.section || 'Common Hall';
  const userName = options.userName || (options.source === 'waiter' ? 'waiter' : 'admin');
  const waiterName = options.waiterName || options.customerName || 'Staff';
  const timeStr = time12h();

  return [
    { t: centerText(section), align: 'center' },
    { t: centerText(`Table: ${tableNumber}`), big: true, align: 'center' },
    { t: centerText('*** CANCELLED ORDER ***'), big: true, align: 'center' },
    { t: `USER:${userName}` },
    { t: '--------------------------------' },
    { t: `Waiter Name : ${waiterName}` },
    { t: '--------------------------------' },
    { t: padHeader('QTY  CANCELLED ITEM', timeStr) },
    { t: '--------------------------------' },
    ...removedItems.map(i => {
      const q = String(i.quantity).padStart(2, ' ');
      const name = String(i.name || '').toUpperCase();
      return { t: `${q}   ${name}` };
    }),
    { t: '--------------------------------' }
  ];
};

const calculateBillDetails = (subtotal, discountAmount = 0) => {
  const taxable = Math.max(0, subtotal - discountAmount);
  const cgst = +(taxable * 0.025).toFixed(2);
  const sgst = +(taxable * 0.025).toFixed(2);
  const rawTotal = taxable + cgst + sgst;
  const grandTotal = Math.round(rawTotal);
  const roundOff = +(grandTotal - rawTotal).toFixed(2);
  return {
    subtotal: +subtotal.toFixed(2),
    discount: +discountAmount.toFixed(2),
    taxable: +taxable.toFixed(2),
    cgst,
    sgst,
    roundOff,
    grandTotal
  };
};

const formatCustomerTaxInvoiceLines = ({
  billNo = '3663',
  date,
  tableName = '',
  customerName = '',
  customerGstin = '',
  items = [],
  calc,
  isDuplicate = false
}) => {
  const L = [];
  L.push({ t: 'SPARKLING', align: 'center', big: true });
  L.push({ t: 'GARDEN RESTAURANT', align: 'center' });
  L.push({ t: 'At. & Po.Rasana Mota, Palanpur Highway,Deesa- 385535', align: 'center' });
  L.push({ t: 'EMail:thesparkling2018@gmail.com , Mobile : +91 94093 22022', align: 'center' });
  L.push({ t: '------------------------------------------------' });

  const bNo = String(billNo).padEnd(6, ' ');
  const dStr = date || new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  const title = isDuplicate ? '[DUPLICATE INVOICE]' : '[TAX INVOICE]';
  L.push({ t: `Bill No:  ${bNo}      ${title}      Date: ${dStr}` });
  L.push({ t: `Name:     ${customerName}` });
  L.push({ t: `GST IN:   ${(customerGstin || '').padEnd(16, ' ')} Table No: ${tableName}` });
  L.push({ t: '------------------------------------------------' });
  L.push({ t: 'Sr. No  D E S C R I P T I O N       QTY   PRICE   AMOUNT' });
  L.push({ t: '------------------------------------------------' });

  items.forEach((item, idx) => {
    const sr = String(idx + 1).padEnd(6, ' ');
    const desc = String(item.name || '').toUpperCase().slice(0, 23).padEnd(24, ' ');
    const qty = String(item.quantity).padStart(3, ' ');
    const price = Number(item.price).toFixed(2).padStart(8, ' ');
    const amount = Number(item.price * item.quantity).toFixed(2).padStart(8, ' ');
    L.push({ t: `${sr}${desc}${qty} ${price} ${amount}` });
  });

  L.push({ t: '------------------------------------------------' });

  const totalStr = Number(calc.subtotal).toFixed(2).padStart(9, ' ');
  const discStr = calc.discount > 0 ? Number(calc.discount).toFixed(2).padStart(9, ' ') : ''.padStart(9, ' ');
  const cgstStr = Number(calc.cgst).toFixed(2).padStart(9, ' ');
  const sgstStr = Number(calc.sgst).toFixed(2).padStart(9, ' ');
  const roundOffStr = Number(calc.roundOff).toFixed(2).padStart(9, ' ');
  const grandTotalStr = Number(calc.grandTotal).toFixed(2).padStart(9, ' ');

  L.push({ t: `GST. IN : 24BRUPP4641N1Z0            Total:    ${totalStr}` });
  L.push({ t: `HSN/SAC Code : 996334                Disc:     ${discStr}` });
  L.push({ t: `                             C GST @ 2.5% : ${cgstStr}` });
  L.push({ t: `                             S GST @ 2.5% : ${sgstStr}` });
  L.push({ t: `                               Round Off:-  ${roundOffStr}` });
  L.push({ t: '                             -------------------' });
  L.push({ t: `                             Grand Total:   ${grandTotalStr}`, big: true });
  L.push({ t: '------------------------------------------------' });
  L.push({ t: 'Subject to Deesa jurisdiction only', align: 'center' });

  return L;
};

const openOrders = (tableNumber) => Order.find({ tableNumber, status: { $nin: ['Paid', 'Cancelled'] } }).sort({ createdAt: 1 });
const billOf = (orders, table) => {
  const activeItems = orders.flatMap(o => o.items).filter(i => i.status !== 'cancelled');
  const subtotal = activeItems.reduce((a, i) => a + i.price * i.quantity, 0);
  const v = table?.discountValue || 0;
  const discount = Math.min(subtotal, table?.discountType === 'percent' ? subtotal * v / 100 : v);
  const calc = calculateBillDetails(subtotal, discount);
  return { 
    subtotal: calc.subtotal, 
    discount: calc.discount, 
    taxable: calc.taxable,
    cgst: calc.cgst, 
    sgst: calc.sgst, 
    roundOff: calc.roundOff, 
    total: calc.grandTotal, 
    grandTotal: calc.grandTotal 
  };
};
const syncTable = async (tableNumber) => {
  const t = await Table.findOne({ tableId: tableNumber }); if (!t) return null;
  t.currentBill = billOf(await openOrders(tableNumber), t).total; await t.save(); return t;
};

// POST /api/orders (guest, public) and POST /api/pos/orders (waiter): order goes to the kitchen printer
const placeOrder = (source) => async (req, res) => {
  try {
    const { tableNumber, items, customerName, customerMobile } = req.body || {};
    const tn = parseInt(tableNumber, 10);
    if (!Number.isInteger(tn) || tn < 1 || tn > 33 || tn === 13) return res.status(400).json({ message: 'Invalid table number (table 13 does not exist)' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ message: 'No items in order' });
    const table = await Table.findOne({ tableId: tn, isActive: true });
    if (!table) return res.status(404).json({ message: 'Table not found' });
    let name = String(customerName || table.customerName || '').trim(), mobile = String(customerMobile || table.customerMobile || '').trim();
    if (source === 'guest' && (!name || !/^\d{10}$/.test(mobile))) return res.status(400).json({ message: 'Name and a 10-digit mobile number are required' });
    const ids = items.map(i => i.menuItemId || i.menuItem).filter(id => mongoose.Types.ObjectId.isValid(id));
    const docs = new Map((await MenuItem.find({ _id: { $in: ids } }).lean()).map(d => [String(d._id), d]));
    const verified = [];
    for (const i of items) {
      const d = docs.get(String(i.menuItemId || i.menuItem)); const q = parseInt(i.quantity, 10);
      if (!d || !(q > 0)) return res.status(400).json({ message: `Invalid item: ${i.name || i.menuItem}` });
      verified.push({ menuItem: String(d._id), name: d.name, quantity: q, price: d.price, status: 'active' });
    }
    const addOn = table.status === 'occupied';
    const total = verified.reduce((a, i) => a + i.price * i.quantity, 0);
    const existingGuestOrder = source === 'guest'
      ? await Order.findOne({ tableNumber: tn, source: 'guest', status: { $nin: ['Paid', 'Cancelled'] } }).select('+guestAccessToken').sort({ createdAt: -1 })
      : null;
    const guestAccessToken = source === 'guest'
      ? existingGuestOrder?.guestAccessToken || crypto.randomBytes(32).toString('hex')
      : undefined;
    const waiterId = source === 'waiter' ? (req.user?._id || req.body.waiterId) : undefined;
    const waiterName = source === 'waiter' ? (req.user?.name || req.body.waiterName || 'Staff Waiter') : '';
    const order = await Order.create({ tableNumber: tn, items: verified, totalAmount: total, customerName: name, customerMobile: mobile, guestAccessToken, source, waiterId, waiterName, isAddOn: addOn, paymentMode: 'Pending' });
    Object.assign(table, { status: 'occupied', sessionStart: table.sessionStart || new Date() });
    if (name) table.customerName = name; if (mobile) table.customerMobile = mobile;
    await table.save(); await syncTable(tn);
    await queue(req, 'kitchen', 'kitchen', tn, kitchenLines(tn, verified, addOn, {
      section: table.section || 'Common Hall',
      userName: req.user?.name || (source === 'guest' ? 'guest' : 'waiter'),
      waiterName: waiterName || table.customerName || 'Staff'
    }));
    const io = req.app.get('socketio');
    if (io) io.to('staff').emit('new_order', order);
    emit(req, 'table_update', { tableId: tn });
    const responseOrder = order.toObject();
    delete responseOrder.guestAccessToken;
    res.status(201).json({ ...responseOrder, guestAccessToken });
  } catch (e) { console.error(e); res.status(500).json({ message: 'Server Error processing order' }); }
};

// GET /api/pos/tables: all tables or occupied tables with open orders + bill
const occupied = async (req, res) => {
  const filter = req.query.all === 'true' 
    ? { isActive: true, tableId: { $ne: 13 } } 
    : { isActive: true, status: { $in: ['occupied', 'billing'] }, tableId: { $ne: 13 } };
  const tables = await Table.find(filter).sort({ tableId: 1 }).lean();
  res.json(await Promise.all(tables.map(async t => { const orders = await openOrders(t.tableId); return { ...t, orders, bill: billOf(orders, t) }; })));
};

// PATCH /api/pos/orders/:id/items/:idx  { quantity }  (quantity 0 = remove, prints cancel receipt)
const editItem = async (req, res) => {
  const o = await Order.findById(req.params.id); const it = o?.items[req.params.idx];
  if (!it) return res.status(404).json({ message: 'Item not found' });
  
  // Critical financial immutability rule: finalized and paid bills cannot be modified
  if (o.status === 'Paid') {
    return res.status(403).json({ message: 'Critical Financial Rule: Paid bills are immutable. Corrections must use authorized adjustment/refund.' });
  }

  const q = parseInt(req.body.quantity, 10); if (!(q >= 0)) return res.status(400).json({ message: 'Invalid quantity' });
  const oldQ = it.quantity;
  if (q === oldQ) return res.json(o);

  const activeWaiter = (req.user?.role === 'waiter' ? req.user.name : null) || o.waiterName || req.user?.name || 'Staff Waiter';
  const activeUser = req.user?.name || (req.user?.role === 'waiter' ? 'waiter' : 'admin');

  // Case 1: Quantity reduced or item cancelled -> Send CANCELLED TICKET to kitchen
  if (q === 0 || q < oldQ) {
    const removed = q === 0 ? oldQ : oldQ - q;
    await queue(req, 'cancel', 'kitchen', o.tableNumber, cancelKitchenLines(o.tableNumber, [{ quantity: removed, name: it.name }], {
      section: 'Common Hall',
      userName: activeUser,
      waiterName: activeWaiter
    }));
  }

  // Case 2: Quantity increased -> Send ADD-ON TICKET to kitchen
  if (q > oldQ) {
    const added = q - oldQ;
    await queue(req, 'kitchen', 'kitchen', o.tableNumber, kitchenLines(o.tableNumber, [{ quantity: added, name: it.name }], true, {
      section: 'Common Hall',
      userName: activeUser,
      waiterName: activeWaiter
    }));
  }
  
  if (q === 0) {
    it.status = 'cancelled';
  } else {
    it.quantity = q;
    it.status = 'active';
  }

  if (req.user?.role === 'waiter') {
    o.waiterId = req.user._id;
    o.waiterName = activeWaiter;
  }

  o.totalAmount = o.items.filter(i => i.status !== 'cancelled').reduce((a, i) => a + i.price * i.quantity, 0);
  await o.save(); 
  await syncTable(o.tableNumber); 

  const io = req.app.get('socketio');
  if (io) {
    io.to('staff').emit('order_status_update', o);
    io.to(`table-${o.tableNumber}`).emit('order_status_update', o);
    io.emit('table_update', { tableId: o.tableNumber });
  }
  emit(req, 'table_update', { tableId: o.tableNumber }); 

  // Record immutable bill audit trail (B24)
  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user?._id,
      role: req.user?.role || 'waiter',
      action: q === 0 
        ? `Cancelled item "${it.name}" (${oldQ} pcs) on Table ${o.tableNumber}` 
        : `Updated quantity of "${it.name}" from ${oldQ} to ${q} on Table ${o.tableNumber} (${q < oldQ ? `${oldQ - q} cancelled` : `${q - oldQ} added`})`,
      entityType: 'Order',
      entityId: o._id.toString()
    });
  } catch (logErr) { console.error('Audit log failed:', logErr.message); }

  res.json({
    order: o,
    itemName: it.name,
    oldQuantity: oldQ,
    newQuantity: q,
    diff: q - oldQ,
    action: q === 0 ? 'cancelled' : q < oldQ ? 'reduced' : 'increased',
    cancelledQty: q < oldQ ? (q === 0 ? oldQ : oldQ - q) : 0,
    addedQty: q > oldQ ? (q - oldQ) : 0
  });
};

const tableAction = (fn) => async (req, res) => {
  const tn = parseInt(req.params.tableId, 10); const table = await Table.findOne({ tableId: tn });
  if (!table) return res.status(404).json({ message: 'Table not found' });
  await fn(req, res, tn, table); emit(req, 'table_update', { tableId: tn });
};
const setCustomer = tableAction(async (req, res, tn, t) => {
  const { name, mobile } = req.body || {};
  t.customerName = String(name ?? t.customerName).trim(); t.customerMobile = String(mobile ?? t.customerMobile).trim(); await t.save();
  await Order.updateMany({ tableNumber: tn, status: { $nin: ['Paid', 'Cancelled'] } }, { customerName: t.customerName, customerMobile: t.customerMobile });
  res.json(t);
});
const setDiscount = tableAction(async (req, res, tn, t) => {
  const { type, value, managerPin } = req.body || {}; const v = Number(value);
  if (!['percent', 'flat'].includes(type) || !(v >= 0) || (type === 'percent' && v > 100)) return res.status(400).json({ message: 'Invalid discount' });

  // Discount authorization (B11): discounts above 10% or flat Rs 100 require manager authorization
  const requiresAuth = (type === 'percent' && v > 10) || (type === 'flat' && v > 100);
  if (requiresAuth && req.user?.role !== 'admin' && managerPin !== '9999' && managerPin !== 'admin123') {
    return res.status(403).json({ message: 'Discount exceeds cashier threshold. Manager authorization PIN required.' });
  }

  t.discountType = type; t.discountValue = v; await t.save(); await syncTable(tn);

  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user?._id,
      role: req.user?.role || 'billing',
      action: `Applied ${type} discount of ${v} on Table ${tn} (Authorized: ${requiresAuth ? 'Manager PIN' : 'Standard Cashier Limit'})`,
      entityType: 'Table',
      entityId: tn.toString()
    });
  } catch (e) {}

  res.json(await Table.findOne({ tableId: tn }));
});
const reprintKitchen = tableAction(async (req, res, tn) => {
  const items = (await openOrders(tn)).flatMap(o => o.items).filter(i => i.status !== 'cancelled');
  await queue(req, 'kitchen', 'kitchen', tn, kitchenLines(tn, items, false, {
    section: 'Common Hall',
    userName: req.user?.name || 'admin',
    waiterName: 'Staff'
  })); res.json({ ok: true });
});
const printBill = tableAction(async (req, res, tn, t) => {
  const orders = await openOrders(tn); 
  const b = billOf(orders, t);
  const items = orders.flatMap(o => o.items).filter(i => i.status !== 'cancelled');
  const billNo = orders[0]?.invoiceNumber || (parseInt(orders[0]?._id?.toString().slice(-4), 16) % 9000 + 1000) || 3663;
  
  const L = formatCustomerTaxInvoiceLines({
    billNo,
    date: new Date().toLocaleDateString('en-GB'),
    tableName: tn,
    customerName: t.customerName || '',
    customerGstin: t.customerGstin || '',
    items,
    calc: b,
    isDuplicate: false
  });

  await queue(req, 'bill', 'bill', tn, L); 
  res.json({ ...b, lines: L });
});

// Cash payment: closes the session and frees the table
const payCash = tableAction(async (req, res, tn, t) => {
  const open = await openOrders(tn);
  if (!open.length) return res.status(400).json({ message: 'No active orders on this table to settle' });
  const b = billOf(open, t);
  const items = open.flatMap(o => o.items).filter(i => i.status !== 'cancelled');
  const billNo = open[0]?.invoiceNumber || (parseInt(open[0]?._id?.toString().slice(-4), 16) % 9000 + 1000) || 3663;

  await Order.updateMany(
    { tableNumber: tn, status: { $nin: ['Paid', 'Cancelled'] } }, 
    { 
      status: 'Paid', 
      paymentMode: 'Cash',
      invoiceNumber: billNo,
      discountAmount: b.discount,
      subtotal: b.subtotal,
      cgst: b.cgst,
      sgst: b.sgst,
      roundOff: b.roundOff,
      totalAmount: b.grandTotal
    }
  );

  // Auto-print customer tax invoice matching the official format
  const L = formatCustomerTaxInvoiceLines({
    billNo,
    date: new Date().toLocaleDateString('en-GB'),
    tableName: tn,
    customerName: t.customerName || '',
    customerGstin: t.customerGstin || '',
    items,
    calc: b,
    isDuplicate: false
  });
  await queue(req, 'bill', 'bill', tn, L);

  Object.assign(t, { 
    status: 'available', 
    currentBill: 0, 
    sessionStart: null, 
    customerName: '', 
    customerMobile: '', 
    discountType: 'flat', 
    discountValue: 0 
  });
  await t.save();

  try {
    const ActivityLog = require('../models/ActivityLog');
    await ActivityLog.create({
      userId: req.user?._id,
      userName: req.user?.name || 'Cashier',
      role: req.user?.role || 'billing',
      action: `Settled Bill #${billNo} of ₹${b.grandTotal} (Cash) for Table ${tn}. Released to Available.`,
      entityType: 'Bill',
      entityId: billNo.toString()
    });
  } catch (e) {}

  res.json({ ok: true, invoiceNumber: billNo, ...b, lines: L });
});
// Today's orders / date-wise history (max 4 months)
const history = async (req, res) => {
  const min = new Date(Date.now() - 120 * 864e5); const f = { createdAt: { $gte: min } };
  if (req.query.date) { const d = new Date(req.query.date + 'T00:00:00+05:30'); if (isNaN(d)) return res.status(400).json({ message: 'Invalid date' }); f.createdAt = { $gte: new Date(Math.max(d, min)), $lt: new Date(d.getTime() + 864e5) }; }
  if (req.query.q) { const r = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ customerName: r }, { customerMobile: r }, ...(+req.query.q ? [{ tableNumber: +req.query.q }] : [])]; }
  res.json(await Order.find(f).sort({ createdAt: -1 }).limit(500));
};

const posStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayPaid = await Order.find({ createdAt: { $gte: startOfDay }, status: 'Paid' }).lean();
    const todayRevenue = todayPaid.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
    
    const occupiedTables = await Table.find({ isActive: true, status: { $in: ['occupied', 'billing'] } }).lean();
    const activeTabsTotal = occupiedTables.reduce((s, t) => s + (Number(t.currentBill) || 0), 0);

    res.json({
      todayRevenue: Number(todayRevenue.toFixed(2)),
      todayOrderCount: todayPaid.length,
      occupiedCount: occupiedTables.length,
      activeTabsTotal: Number(activeTabsTotal.toFixed(2)),
      cashCollected: Number(todayRevenue.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(100).populate('userId', 'name role');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const reprintFinalBill = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const o = await Order.findById(orderId);
    if (!o) return res.status(404).json({ message: 'Order not found' });
    const items = o.items.filter(i => i.status !== 'cancelled');
    const billNo = o.invoiceNumber || (parseInt(o._id.toString().slice(-4), 16) % 9000 + 1000) || 3663;
    const subtotal = o.subtotal || items.reduce((a, i) => a + i.price * i.quantity, 0);
    const discount = o.discountAmount || 0;
    const calc = calculateBillDetails(subtotal, discount);

    const L = formatCustomerTaxInvoiceLines({
      billNo,
      date: new Date(o.createdAt).toLocaleDateString('en-GB'),
      tableName: o.tableNumber,
      customerName: o.customerName || '',
      customerGstin: o.customerGstin || '',
      items,
      calc,
      isDuplicate: true
    });

    await queue(req, 'bill', 'bill', o.tableNumber, L);
    res.json({ ok: true, lines: L, calc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// Print agent endpoints (claim atomically, report result)
const claim = async (req, res) => res.json(await PrintJob.findOneAndUpdate({ status: 'pending' }, { status: 'printing', $inc: { attempts: 1 } }, { sort: { createdAt: 1 }, new: true }));
const result = async (req, res) => { const ok = !!req.body.ok; const j = await PrintJob.findById(req.params.id); if (!j) return res.status(404).end(); j.status = ok ? 'printed' : (j.attempts >= 3 ? 'failed' : 'pending'); await j.save(); res.json(j); };
const failed = async (req, res) => res.json(await PrintJob.find({ status: 'failed' }).sort({ createdAt: -1 }).limit(50));
const retry = async (req, res) => res.json(await PrintJob.findByIdAndUpdate(req.params.id, { status: 'pending', attempts: 0 }, { new: true }));
const getPrintJobs = async (req, res) => {
  const jobs = await PrintJob.find().sort({ createdAt: -1 }).limit(50);
  res.json(jobs);
};

module.exports = { placeOrder, occupied, editItem, setCustomer, setDiscount, reprintKitchen, printBill, payCash, history, claim, result, failed, retry, getPrintJobs, posStats, getAuditLogs, reprintFinalBill, kitchenLines, cancelKitchenLines };
