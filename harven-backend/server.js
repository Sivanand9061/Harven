const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// ============================================
// REQUEST ID TRACKING (for audit logs)
// ============================================
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    console.log(`[${new Date().toISOString()}] [${req.id}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// SECURITY HEADERS (Helmet)
// ============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:5001"]
        }
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'no-referrer' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));

// ============================================
// CORS: Restrict to allowed origins only
// ============================================
const allowedOrigins = [
    'http://localhost',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5001',
    'http://127.0.0.1',
    process.env.FRONTEND_URL || 'http://localhost'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ============================================
// BODY PARSER WITH SIZE LIMITS
// ============================================
app.use(express.json({ limit: '10kb' })); // Limit JSON payload to 10KB
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// ============================================
// STATIC FILES: Serve Uploaded Images
// ============================================
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// RATE LIMITING: Login endpoint (Brute force protection)
// ============================================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development' // Disable in development if needed
});

// ============================================
// RATE LIMITING: Contact form submissions
// ============================================
const leadSubmissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Maximum 10 requests per hour
    message: 'Too many submissions from this IP. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// RATE LIMITING: Product API endpoints
// ============================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Maximum 100 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false
});

// ============================================
// ERROR HANDLING: Catch malformed JSON
// ============================================
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error(`[${req.id}] Malformed JSON received`);
        return res.status(400).json({
            success: false,
            requestId: req.id,
            message: 'Invalid JSON in request body'
        });
    }
    next();
});

// Routes
const leadRoutes = require('./routes/leadRoutes');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

// ============================================
// APPLY RATE LIMITERS TO ENDPOINTS
// ============================================
app.post('/api/auth/login', loginLimiter);
app.post('/api/leads', leadSubmissionLimiter);
app.use('/api/products', apiLimiter);

app.use('/api/leads', leadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// ============================================
// HEALTH CHECK ENDPOINT (Public)
// ============================================
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ERROR HANDLING: 404 Not Found
// ============================================
app.use((req, res) => {
    console.warn(`[${req.id}] 404 Not Found: ${req.method} ${req.path}`);
    res.status(404).json({
        success: false,
        requestId: req.id,
        message: 'Endpoint not found'
    });
});

// ============================================
// DATABASE CONNECTION
// ============================================
const seedDatabase = require('./seed');

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        // Seed database with initial products on first run
        await seedDatabase();
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Security headers enabled with Helmet`);
});