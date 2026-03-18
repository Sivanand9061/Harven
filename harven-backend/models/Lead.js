const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    firstName: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true,
        minlength: [1, 'Name must be at least 1 character'],
        maxlength: [100, 'Name must not exceed 100 characters']
    },
    lastName: { 
        type: String, 
        trim: true,
        maxlength: [100, 'Last name must not exceed 100 characters'],
        default: ''
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'],
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    company: { 
        type: String,
        trim: true,
        maxlength: [100, 'Company name must not exceed 100 characters']
    },
    phone: { 
        type: String,
        trim: true,
        match: [/^[\d\s\-\+\(\)]{0,20}$/, 'Please provide a valid phone number']
    },
    subject: { 
        type: String, 
        required: [true, 'Subject is required'],
        trim: true,
        minlength: [3, 'Subject must be at least 3 characters'],
        maxlength: [200, 'Subject must not exceed 200 characters']
    },
    message: { 
        type: String, 
        required: [true, 'Message is required'],
        trim: true,
        minlength: [10, 'Message must be at least 10 characters'],
        maxlength: [5000, 'Message must not exceed 5000 characters']
    },
    status: { 
        type: String, 
        default: 'New',
        enum: ['New', 'Contacted', 'Converted', 'Lost']
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', leadSchema);