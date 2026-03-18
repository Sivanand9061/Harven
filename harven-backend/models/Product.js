const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [3, 'Product name must be at least 3 characters'],
        maxlength: [100, 'Product name must not exceed 100 characters']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['grains', 'produce', 'nuts', 'spices', 'processed', 'frozen'],
        lowercase: true
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [2000, 'Description must not exceed 2000 characters']
    },
    origin: {
        type: String,
        trim: true,
        maxlength: [100, 'Origin must not exceed 100 characters']
    },
    packaging: {
        type: String,
        trim: true,
        maxlength: [100, 'Packaging must not exceed 100 characters']
    },
    moq: {
        type: Number,
        required: [true, 'MOQ (Minimum Order Quantity) is required'],
        min: [1, 'MOQ must be at least 1'],
        max: [1000000, 'MOQ is too large']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
        max: [99999, 'Price exceeds maximum allowed']
    },
    image: {
        type: String,
        trim: true,
        default: 'https://images.unsplash.com/photo-1599599810694-2eea62f3c5?w=400'
    },
    inStock: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now,
        set: () => Date.now()
    }
});

module.exports = mongoose.model('Product', productSchema);
