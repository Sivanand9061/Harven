const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

// ============================================
// FIREBASE INITIALIZATION (replaces Mongoose)
// ============================================
const { db } = require('./firebase');

const app = express();

// ============================================
// REQUEST ID TRACKING
// ============================================
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

// ============================================
// SECURITY HEADERS
// ============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc:  ["'self'", "'unsafe-inline'"],
            imgSrc:     ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://*.onrender.com", "http://localhost:5001", "http://localhost:5000", "devtools://devtools"]
        }
    },
    frameguard:     { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' }
}));

// ============================================
// CORS
// ============================================
const allowedOrigins = [
    'http://localhost:5001',
    'http://localhost:3000',
    'http://127.0.0.1:5500',
    // Netlify frontend — update after deploy if slug differs
    'https://harvenllc.netlify.app',
    /\.netlify\.app$/,           // any Netlify preview URL
    /\.onrender\.com$/           // Render preview URLs
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, Postman, mobile apps)
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.some(o =>
            o instanceof RegExp ? o.test(origin) : o === origin
        );
        if (allowed) return callback(null, true);
        return callback(new Error('CORS: origin not allowed — ' + origin));
    },
    credentials:    true,
    methods:        ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));


app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: false }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ROUTES
// ============================================
const leadRoutes    = require('./routes/leadRoutes');
const authRoutes    = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

app.use('/api/leads',    leadRoutes);
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', online: true, db: 'firebase' });
});

// Chrome DevTools well-known endpoint (Chrome 136+ auto-probes this)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.json({ version: '1.0', endpoints: [] });
});

// 404 catch-all
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`🚀 Server active on port ${PORT}`);
    console.log(`🔥 Database: Firebase Firestore`);
});