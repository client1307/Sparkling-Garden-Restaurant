const express = require('express');
const { loginUser, registerUser } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts' }), loginUser);
router.post('/register', protect, adminOnly, registerUser);

module.exports = router;
