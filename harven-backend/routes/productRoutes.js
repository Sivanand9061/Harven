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
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'product-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});
// ============================================
// SECURITY: Input Sanitization - XSS Prevention
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}

// Sanitize product object before saving to database
function sanitizeProduct(productData) {
    return {
        name: escapeHtml(productData.name || ''),
        category: productData.category || '',
        description: escapeHtml(productData.description || ''),
        origin: escapeHtml(productData.origin || ''),
        packaging: escapeHtml(productData.packaging || ''),
        moq: parseInt(productData.moq) || 0,
        price: parseFloat(productData.price) || 0,
        image: productData.image || '',
        inStock: productData.inStock === true || productData.inStock === 'true'
    };
}

// ============================================
// SECURITY: JWT Authentication Middleware
// ============================================
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-token'];

    if (!token) {
        console.warn(`[${req.id}] Unauthorized access attempt: no token provided`);
        return res.status(401).json({
            success: false,
            requestId: req.id,
            message: 'Access denied. No token provided.'
        });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, jwtSecret, {
            algorithms: ['HS256'],
            issuer: 'harven-admin'
        });
        req.admin = decoded.admin;
        req.tokenIat = decoded.iat;
        next();
    } catch (error) {
        console.warn(`[${req.id}] Invalid token: ${error.message}`);
        return res.status(403).json({
            success: false,
            requestId: req.id,
            message: 'Invalid or expired token.'
        });
    }
}

// ============================================
// GET: Fetch all products (Public API)
// ============================================
router.get('/', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 products
        const skip = Math.max(parseInt(req.query.skip) || 0, 0);

        const products = await Product.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean(); // Use lean() for faster read-only queries

        const total = await Product.countDocuments();

        console.log(`[${req.id}] ✅ Fetched ${products.length} products`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            count: products.length,
            total: total,
            data: products
        });
    } catch (error) {
        console.error(`[${req.id}] Error fetching products:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not fetch products.'
        });
    }
});

// ============================================
// GET: Fetch single product by ID (Public API)
// ============================================
router.get('/:id', validateProductId, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                requestId: req.id,
                message: 'Product not found.'
            });
        }

        console.log(`[${req.id}] ✅ Fetched product: ${product._id}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            data: product
        });
    } catch (error) {
        console.error(`[${req.id}] Error fetching product:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not fetch product.'
        });
    }
});

// ============================================
// POST: Create new product (PROTECTED - Admin only)
// ============================================
router.post('/', verifyToken, upload.single('image'), validateProduct, async (req, res) => {
    try {
        const sanitizedData = sanitizeProduct(req.body);

        // Map uploaded file path if it exists
        if (req.file) {
            sanitizedData.image = `/uploads/${req.file.filename}`;
        }

        const newProduct = new Product(sanitizedData);
        const savedProduct = await newProduct.save();

        // ============================================
        // AUDIT LOG: Admin action
        // ============================================
        console.log(`[${req.id}] ✅ Product created by admin`);
        console.log(`    Product ID: ${savedProduct._id}`);
        console.log(`    Product Name: ${savedProduct.name}`);
        console.log(`    IP: ${req.ip}`);

        res.status(201).json({
            success: true,
            requestId: req.id,
            message: 'Product created successfully.',
            data: savedProduct
        });
    } catch (error) {
        console.error(`[${req.id}] Error creating product:`, error.message);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                requestId: req.id,
                message: 'Validation error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not create product.'
        });
    }
});

// ============================================
// PUT: Update product (PROTECTED - Admin only)
// ============================================
router.put('/:id', verifyToken, upload.single('image'), validateProductId, validateProduct, async (req, res) => {
    try {
        const sanitizedData = sanitizeProduct(req.body);

        // Map uploaded file path if it exists
        if (req.file) {
            sanitizedData.image = `/uploads/${req.file.filename}`;
        } else if (!req.body.image || req.body.image === 'undefined' || req.body.image === 'null') {
            // Keep existing image if no new explicitly valid URL or file is provided
            delete sanitizedData.image; 
        }

        // Add updatedAt timestamp
        sanitizedData.updatedAt = new Date();

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            sanitizedData,
            { new: true, runValidators: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                requestId: req.id,
                message: 'Product not found.'
            });
        }

        // ============================================
        // AUDIT LOG: Admin action
        // ============================================
        console.log(`[${req.id}] ✅ Product updated by admin`);
        console.log(`    Product ID: ${req.params.id}`);
        console.log(`    Product Name: ${updatedProduct.name}`);
        console.log(`    IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            message: 'Product updated successfully.',
            data: updatedProduct
        });
    } catch (error) {
        console.error(`[${req.id}] Error updating product:`, error.message);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                requestId: req.id,
                message: 'Validation error',
                errors: errors
            });
        }

        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not update product.'
        });
    }
});

// ============================================
// DELETE: Delete product (PROTECTED - Admin only)
// ============================================
router.delete('/:id', verifyToken, validateProductId, async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({
                success: false,
                requestId: req.id,
                message: 'Product not found.'
            });
        }

        // ============================================
        // AUDIT LOG: Admin action
        // ============================================
        console.log(`[${req.id}] ✅ Product deleted by admin`);
        console.log(`    Product ID: ${req.params.id}`);
        console.log(`    Product Name: ${deletedProduct.name}`);
        console.log(`    IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            message: 'Product deleted successfully.',
            data: deletedProduct
        });
    } catch (error) {
        console.error(`[${req.id}] Error deleting product:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not delete product.'
        });
    }
});

module.exports = router;
