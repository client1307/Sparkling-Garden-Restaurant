const express = require('express');
const c = require('../controllers/specController');
const { protect, authorize } = require('../middleware/authMiddleware');
const router = express.Router();

// Print agent (bill/kitchen PC): authenticated by a shared key, not a user login
const agent = (req, res, next) => {
  if (!process.env.PRINT_AGENT_KEY || req.headers['x-agent-key'] !== process.env.PRINT_AGENT_KEY) {
    console.warn('Rejected print-agent authentication', { ip: req.ip });
    return res.status(401).json({ message: 'Bad agent key' });
  }
  next();
};
router.post('/print/claim', agent, c.claim);
router.post('/print/:id/result', agent, c.result);

// Staff routes work only from the configured restaurant network (empty = allow all in dev).
router.use((req, res, next) => {
  const allowed = (process.env.STAFF_ALLOWED_IPS || '').split(',').map(s => s.trim()).filter(Boolean);
  const requestIp = (req.ip || '').replace('::ffff:', '');
  if (!allowed.length || allowed.includes(req.ip) || allowed.includes(requestIp) || ['127.0.0.1', '::1', 'localhost'].includes(requestIp)) return next();
  res.status(403).json({ message: 'Staff access is only allowed from the restaurant network' });
});
const staff = [protect, authorize('admin', 'waiter', 'billing')];
const billing = [protect, authorize('admin', 'billing')];
router.get('/tables', staff, c.occupied);
router.post('/orders', staff, c.placeOrder('waiter'));
router.patch('/orders/:id/items/:idx', staff, c.editItem);
router.patch('/tables/:tableId/customer', billing, c.setCustomer);
router.patch('/tables/:tableId/discount', billing, c.setDiscount);
router.post('/tables/:tableId/kitchen-reprint', billing, c.reprintKitchen);
router.post('/tables/:tableId/bill', billing, c.printBill);
router.post('/tables/:tableId/pay', billing, c.payCash);
router.get('/history', billing, c.history);
router.get('/stats', billing, c.posStats);
router.get('/audit', billing, c.getAuditLogs);
router.post('/orders/:orderId/reprint', billing, c.reprintFinalBill);
router.get('/print/failed', billing, c.failed);
router.get('/print/jobs', staff, c.getPrintJobs);
router.post('/print/:id/retry', billing, c.retry);
module.exports = router;
