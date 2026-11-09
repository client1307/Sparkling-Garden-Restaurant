const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { execSync } = require('child_process');
const jwt = require('jsonwebtoken');
const { isValidTableCapability } = require('./utils/tableCapability');
const connectDB = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const forecastRoutes = require('./routes/forecastRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback to root .env if present

const requiredSecrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    PRINT_AGENT_KEY: process.env.PRINT_AGENT_KEY
};
const invalidSecrets = Object.entries(requiredSecrets)
    .filter(([name, value]) => !value || value.startsWith('replace_with_') || value.length < 32)
    .map(([name]) => name);

if (invalidSecrets.length) {
    throw new Error(`Missing or insecure required secrets: ${invalidSecrets.join(', ')}`);
}

connectDB(); // Connect to MongoDB

const app = express();
app.set('trust proxy', process.env.TRUST_PROXY || 1);
const server = http.createServer(app);

// Socket.io Setup (Real-time Engine)
const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
if (!allowedOrigins.length && process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL must be configured in production');
}
const corsOrigin = allowedOrigins.length ? allowedOrigins : false;
const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,      // Wait 60s for pong before considering disconnected (default 5s is too aggressive)
    pingInterval: 25000,     // Send ping every 25s to keep connection alive
    transports: ['websocket', 'polling'], // Support both transports  
    allowUpgrades: true
});
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
        socket.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        next(new Error('Invalid socket authentication'));
    }
});

// Apply Middleware
app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.disable('x-powered-by');
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.get('x-forwarded-proto') === 'http') {
        return res.redirect(308, `https://${req.get('host')}${req.originalUrl}`);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: wss:;");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
});

// Inject Socket.io into Request object so Controllers can use it
app.use((req, res, next) => {
    req.app.set('socketio', io);
    next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes); // Menu Management (w/ Auto-Disable)
app.use('/api/orders', orderRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pos', require('./routes/posRoutes'));
app.use('/api/tables', require('./routes/tableRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Home & Health Routes
app.get('/', (req, res) => {
    res.send('The Sparkling API is running...');
});
app.get('/healthz', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ status: 'healthy', time: new Date() }));

// Keep-alive: Pings self every 9 minutes to prevent Render free-tier from sleeping
const https = require('https');
setInterval(() => {
    try {
        const renderUrl = (process.env.RENDER_EXTERNAL_URL || 'https://sparkling-api.onrender.com').replace(/\/+$/, '');
        https.get(`${renderUrl}/api/health`, (res) => {
            // Heartbeat consumed silently
        }).on('error', () => {});
    } catch (e) {}
}, 9 * 60 * 1000);

// Error Handling Middleware (Prevent Crashes)
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('Bad JSON received:', err.message);
        return res.status(400).send({ message: 'Invalid JSON payload' });
    }
    console.error(err.stack);
    if (process.env.NODE_ENV !== 'production') {
        return res.status(500).send({ message: 'Internal Server Error', error: err.message });
    }
    res.status(500).send({ message: 'Internal Server Error' });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
    console.log(`New Client Connected: ${socket.id}`);
    const staffRoles = ['admin', 'waiter', 'kitchen', 'billing'];
    if (staffRoles.includes(socket.user?.role)) socket.join('staff');

    // Join a specific table room (e.g., "table-5")
    socket.on('join_table', (tableId) => {
        if (!staffRoles.includes(socket.user?.role) && !isValidTableCapability(tableId, socket.handshake.auth?.tableToken)) {
            return;
        }
        socket.join(`table-${tableId}`);
        socket.tableId = Number(tableId);
        console.log(`Socket ${socket.id} joined table-${tableId}`);
    });

    socket.on('call_waiter', (data) => {
        if (!socket.user?.role && (!socket.tableId || Number(data?.tableId) !== socket.tableId)) return;
        if (!Number.isInteger(Number(data?.tableId))) return;
        console.log(`Table ${data.tableId} called a waiter`);
        io.to('staff').emit('waiter_called', { tableId: Number(data.tableId) });
    });

    // When waiter updates a table (clear, mark paid, etc.), broadcast to all screens
    socket.on('table_update_from_waiter', () => {
        if (socket.user?.role) io.to('staff').emit('table_update', {});
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;

// ── Auto-fix port conflicts & start server (Windows dev only) ──
const killProcessOnPort = (port) => {
    if (process.platform !== 'win32') return false;
    try {
        const result = execSync(`netstat -ano | findstr ":${port}" | findstr "LISTENING"`, { encoding: 'utf-8' });
        const lines = result.trim().split('\n');
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0' && pid !== String(process.pid)) {
                console.log(`⚠️  Port ${port} is busy (PID ${pid}). Killing old process...`);
                execSync(`taskkill /PID ${pid} /F`, { encoding: 'utf-8' });
                console.log(`✅ Killed PID ${pid}`);
            }
        }
        return true;
    } catch (e) {
        // No process found on port — all clear
        return false;
    }
};

const startServer = () => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server running on port ${PORT} (network accessible)`);
    });
};

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is already in use. Attempting auto-fix...`);
        killProcessOnPort(PORT);
        // Wait 1 second for port to free up, then retry
        setTimeout(() => {
            server.close();
            startServer();
        }, 1000);
    } else {
        console.error('Server error:', err);
        process.exit(1);
    }
});

// ── Graceful shutdown (prevents zombie processes) ──
const gracefulShutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    io.close();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
    // Force exit after 3s if graceful shutdown hangs
    setTimeout(() => process.exit(0), 3000);
};

process.on('SIGINT', gracefulShutdown);   // Ctrl+C
process.on('SIGTERM', gracefulShutdown);  // Kill command

startServer();
