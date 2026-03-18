// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================
// Provides sanitization and validation for all user inputs

const { body, validationResult, param } = require('express-validator');

/**
 * Validation error handler
 * Returns 400 with detailed error messages if validation fails
 */
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array().map(err => ({
                field: err.param || 'unknown',
                message: err.msg
            }))
        });
    }
    next();
}

/**
 * Login validation
 */
const validateLogin = [
    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 1, max: 500 }).withMessage('Invalid password format'),
    handleValidationErrors
];

/**
 * Lead submission validation
 */
const validateLead = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('lastName')
        .trim()
        .optional()
        .isLength({ max: 100 }).withMessage('Last name cannot exceed 100 characters')
        .matches(/^[a-zA-Z\s'-]*$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    
    body('company')
        .trim()
        .optional()
        .isLength({ max: 200 }).withMessage('Company name cannot exceed 200 characters'),
    
    body('phone')
        .trim()
        .optional()
        .matches(/^[0-9+\-\s\(\)]+$/).withMessage('Invalid phone number format')
        .isLength({ max: 20 }).withMessage('Phone number cannot exceed 20 characters'),
    
    body('subject')
        .trim()
        .notEmpty().withMessage('Subject is required')
        .isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters'),
    
    body('message')
        .trim()
        .notEmpty().withMessage('Message is required')
        .isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),
    
    handleValidationErrors
];

/**
 * Product validation
 */
const validateProduct = [
    body('name')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
    
    body('category')
        .trim()
        .notEmpty().withMessage('Category is required')
        .isIn(['grains', 'produce', 'nuts', 'spices', 'processed', 'frozen'])
        .withMessage('Invalid category'),
    
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be between 10 and 2000 characters'),
    
    body('origin')
        .trim()
        .optional()
        .isLength({ max: 100 }).withMessage('Origin cannot exceed 100 characters'),
    
    body('packaging')
        .trim()
        .optional()
        .isLength({ max: 100 }).withMessage('Packaging info cannot exceed 100 characters'),
    
    body('price')
        .notEmpty().withMessage('Price is required')
        .isFloat({ min: 0, max: 999999 }).withMessage('Price must be a valid number between 0 and 999999'),
    
    body('moq')
        .notEmpty().withMessage('MOQ is required')
        .isInt({ min: 1, max: 999999 }).withMessage('MOQ must be a valid integer between 1 and 999999'),
    
    body('image')
        .trim()
        .optional()
        .isString().withMessage('Invalid image path'),
    
    body('inStock')
        .optional()
        .isBoolean().withMessage('inStock must be a boolean'),
    
    handleValidationErrors
];

/**
 * Product ID validation
 */
const validateProductId = [
    param('id')
        .trim()
        .matches(/^[a-f0-9]{24}$/).withMessage('Invalid product ID format'),
    handleValidationErrors
];

/**
 * Lead ID validation
 */
const validateLeadId = [
    param('id')
        .trim()
        .matches(/^[a-f0-9]{24}$/).withMessage('Invalid lead ID format'),
    handleValidationErrors
];

module.exports = {
    validateLogin,
    validateLead,
    validateProduct,
    validateProductId,
    validateLeadId,
    handleValidationErrors
};
