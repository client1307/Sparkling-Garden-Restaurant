const buckets = new Map();

const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now - current.startedAt >= windowMs) {
        buckets.set(key, { startedAt: now, count: 1 });
        return next();
    }
    current.count += 1;
    if (current.count > max) {
        return res.status(429).json({ message });
    }
    next();
};

setInterval(() => {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [key, bucket] of buckets) {
        if (bucket.startedAt < cutoff) buckets.delete(key);
    }
}, 15 * 60 * 1000).unref();

module.exports = rateLimit;
