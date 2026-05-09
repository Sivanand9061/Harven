const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Product = require('../models/Product');
const { validateProduct, validateProductId } = require('../middleware/validation');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename:    (req, file, cb) => cb(null, 'product-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images are allowed'));
    }
});

// ============================================
// SECURITY: Input Sanitization
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeProduct(data) {
    return {
        name:        escapeHtml(data.name        || ''),
        category:    data.category               || '',
        description: escapeHtml(data.description || ''),
        origin:      escapeHtml(data.origin      || ''),
        packaging:   escapeHtml(data.packaging   || ''),
        moq:         parseInt(data.moq)          || 0,
        price:       parseFloat(data.price)      || 0,
        image:       data.image                  || '',
        inStock:     data.inStock === true || data.inStock === 'true'
    };
}

// ============================================
// SECURITY: JWT Authentication Middleware
// ============================================
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-token'];
    if (!token) return res.status(401).json({ success: false, requestId: req.id, message: 'Access denied. No token provided.' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'harven-admin' });
        req.admin = decoded.admin;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, requestId: req.id, message: 'Invalid or expired token.' });
    }
}

// ============================================
// GET: Fetch all products (Public)
// ============================================
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const skip  = Math.max(parseInt(req.query.skip)  || 0,   0);

        const [products, total] = await Promise.all([
            Product.findAll({ limit, skip }),
            Product.count()
        ]);

        console.log(`[${req.id}] ✅ Fetched ${products.length} products`);
        res.status(200).json({ success: true, requestId: req.id, count: products.length, total, data: products });
    } catch (error) {
        console.error(`[${req.id}] Error fetching products:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not fetch products.' });
    }
});

// ============================================
// GET: Fetch single product by ID (Public)
// ============================================
router.get('/:id', validateProductId, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, requestId: req.id, message: 'Product not found.' });
        res.status(200).json({ success: true, requestId: req.id, data: product });
    } catch (error) {
        console.error(`[${req.id}] Error fetching product:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not fetch product.' });
    }
});

// ============================================
// POST: Create new product (PROTECTED)
// ============================================
router.post('/', verifyToken, upload.single('image'), validateProduct, async (req, res) => {
    try {
        const sanitizedData = sanitizeProduct(req.body);
        if (req.file) sanitizedData.image = `/uploads/${req.file.filename}`;

        const savedProduct = await Product.create(sanitizedData);
        console.log(`[${req.id}] ✅ Product created: ${savedProduct._id}`);
        res.status(201).json({ success: true, requestId: req.id, message: 'Product created.', data: savedProduct });
    } catch (error) {
        console.error(`[${req.id}] Error creating product:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not create product.' });
    }
});

// ============================================
// PUT: Update product (PROTECTED)
// ============================================
router.put('/:id', verifyToken, upload.single('image'), validateProductId, validateProduct, async (req, res) => {
    try {
        const sanitizedData = sanitizeProduct(req.body);
        if (req.file) {
            sanitizedData.image = `/uploads/${req.file.filename}`;
        } else if (!req.body.image || req.body.image === 'undefined' || req.body.image === 'null') {
            delete sanitizedData.image;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, sanitizedData);
        if (!updatedProduct) return res.status(404).json({ success: false, requestId: req.id, message: 'Product not found.' });

        console.log(`[${req.id}] ✅ Product updated: ${req.params.id}`);
        res.status(200).json({ success: true, requestId: req.id, message: 'Product updated.', data: updatedProduct });
    } catch (error) {
        console.error(`[${req.id}] Error updating product:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not update product.' });
    }
});

// ============================================
// DELETE: Delete product (PROTECTED)
// ============================================
router.delete('/:id', verifyToken, validateProductId, async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) return res.status(404).json({ success: false, requestId: req.id, message: 'Product not found.' });

        console.log(`[${req.id}] ✅ Product deleted: ${req.params.id}`);
        res.status(200).json({ success: true, requestId: req.id, message: 'Product deleted.', data: deletedProduct });
    } catch (error) {
        console.error(`[${req.id}] Error deleting product:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not delete product.' });
    }
});

module.exports = router;
