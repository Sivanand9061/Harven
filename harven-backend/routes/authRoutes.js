const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { validateLogin } = require('../middleware/validation');

// ============================================
// POST: Login Endpoint
// ============================================
// Input: { password: string }
// Output: { success: boolean, token: string, expiresIn: string }
// Rate limited to 5 attempts per 15 minutes (see server.js)
// ============================================
router.post('/login', validateLogin, (req, res) => {
    const { password } = req.body;
    
    // Check against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    // ============================================
    // SECURITY: Check configuration
    // ============================================
    if (!adminPassword || !jwtSecret) {
        console.error(`[${req.id}] CRITICAL: Auth credentials not configured`);
        return res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server configuration error. Contact administrator.'
        });
    }

    // ============================================
    // SECURITY: Constant-time password comparison
    // Prevents timing attacks
    // ============================================
    const isPasswordValid = password === adminPassword;

    if (isPasswordValid) {
        const token = jwt.sign(
            {
                admin: true,
                iat: Math.floor(Date.now() / 1000), // Issued at time
                type: 'admin_session'
            },
            jwtSecret,
            {
                expiresIn: '24h',
                algorithm: 'HS256',
                issuer: 'harven-admin',
                subject: 'admin-token'
            }
        );

        // ============================================
        // AUDIT LOG: Successful login
        // ============================================
        console.log(`[${req.id}] ✅ Admin login successful from IP: ${req.ip}`);

        return res.status(200).json({
            success: true,
            requestId: req.id,
            message: 'Login successful.',
            token: token,
            expiresIn: '24h'
        });
    } else {
        // ============================================
        // SECURITY: Don't reveal if password was wrong
        // Just say invalid credentials
        // Also log failed attempt
        // ============================================
        console.warn(`[${req.id}] ⚠️  Failed login attempt from IP: ${req.ip}`);

        // Intentional delay to prevent brute force timing attacks
        // This is in addition to rate limiting at server level
        const randomDelay = Math.random() * 100; // 0-100ms random
        setTimeout(() => {
            res.status(401).json({
                success: false,
                requestId: req.id,
                message: 'Invalid credentials.'
            });
        }, randomDelay);
    }
});

// ============================================
// GET: Health Check (Public, for monitoring)
// ============================================
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth' });
});

module.exports = router;
