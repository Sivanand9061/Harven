const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const Lead = require('../models/Lead');
const nodemailer = require('nodemailer');
const { validateLead, validateLeadId } = require('../middleware/validation');

// Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
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

// Sanitize lead object before saving to DB
function sanitizeLead(leadData) {
    return {
        firstName: escapeHtml(leadData.firstName || ''),
        lastName: escapeHtml(leadData.lastName || ''),
        email: leadData.email || '', // Email is already validated by middleware
        company: escapeHtml(leadData.company || ''),
        phone: escapeHtml(leadData.phone || ''),
        subject: escapeHtml(leadData.subject || ''),
        message: escapeHtml(leadData.message || ''),
        status: 'new' // Default status for new leads
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
// POST: Create a new lead (Public endpoint)
// ============================================
// Accepts contact form submissions from customers
router.post('/', validateLead, async (req, res) => {
    try {
        // Sanitize all input before saving to database
        const sanitizedData = sanitizeLead(req.body);
        
        const newLead = new Lead(sanitizedData);
        const savedLead = await newLead.save();

        // Store escaped version for email display
        const escapeForEmail = (text) => text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

        // ----------------------------------------------------
        // FIRE OFF REAL-TIME EMAIL TO ADMIN
        // ----------------------------------------------------
        const mailOptions = {
            from: `"HARVEN System" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to the admin
            subject: `New Lead Alert: ${escapeForEmail(savedLead.subject)} - ${escapeForEmail(savedLead.company || savedLead.firstName)}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1b5e3d; margin-top: 0;">New Inquiry Received! 🎉</h2>
                    <p style="color: #555; font-size: 14px;">A new lead has just submitted a request via the HARVEN website.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px; color: #333;">Name:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #555;">${escapeForEmail(savedLead.firstName)} ${escapeForEmail(savedLead.lastName)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Email:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #555;"><a href="mailto:${escapeForEmail(savedLead.email)}" style="color: #3498db;">${escapeForEmail(savedLead.email)}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Company:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #555;">${escapeForEmail(savedLead.company || 'N/A')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Phone:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #555;">${escapeForEmail(savedLead.phone || 'N/A')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Subject:</td>
                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #555;">${escapeForEmail(savedLead.subject)}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 15px 0 5px 0; font-weight: bold; color: #333;">Message:</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding: 15px; background: #f9f9f9; border-radius: 6px; color: #444; line-height: 1.5;">${escapeForEmail(savedLead.message)}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center;">
                        This is an automated message from the HARVEN Lead Management System.
                    </div>
                </div>
            `
        };

        // ----------------------------------------------------
        // FIRE OFF AUTO-RESPONDER TO CUSTOMER (THANK YOU EMAIL)
        // ----------------------------------------------------
        const customerMailOptions = {
            from: `"HARVEN Support" <${process.env.EMAIL_USER}>`,
            to: savedLead.email, // Send to the customer
            subject: `Thank you for contacting HARVEN`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; margin: 0 auto; background: #fff;">
                    <div style="text-align: center; margin-bottom: 25px;">
                        <!-- You can host your logo somewhere and replace this with an <img> tag -->
                        <h1 style="color: #1a1a1a; letter-spacing: 2px; margin: 0;">HARVEN</h1>
                        <p style="color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">Sourcing the World's Best</p>
                    </div>

                    <p style="color: #333; font-size: 16px;">Dear ${escapeForEmail(savedLead.firstName)},</p>
                    
                    <p style="color: #555; line-height: 1.6; font-size: 15px;">
                        Thank you for reaching out to HARVEN. We have securely received your inquiry regarding <strong>${escapeForEmail(savedLead.subject)}</strong>.
                    </p>
                    
                    <p style="color: #555; line-height: 1.6; font-size: 15px;">
                        Our dedicated team is currently reviewing your message and will get back to you with a comprehensive response within <strong>24 business hours</strong>.
                    </p>
                    
                    <p style="color: #555; line-height: 1.6; font-size: 15px;">
                        If you need immediate assistance, please feel free to reply directly to this email.
                    </p>
                    
                    <br>
                    
                    <p style="color: #333; font-size: 15px; margin-bottom: 5px;">Best regards,</p>
                    <p style="color: #1b5e3d; font-weight: bold; font-size: 16px; margin-top: 0;">The HARVEN Team</p>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} HARVEN. All rights reserved.</p>
                        <p style="margin: 4px 0 0 0;">This email was sent to ${escapeForEmail(savedLead.email)}.</p>
                    </div>
                </div>
            `
        };

        // Send emails silently (don't block the response to the user if email fails)
        transporter.sendMail(mailOptions).catch(err => {
            console.error('Nodemailer Error: Failed to send lead alert email:', err);
        });

        transporter.sendMail(customerMailOptions).catch(err => {
            console.error('Nodemailer Error: Failed to send customer thank you email:', err);
        });

        res.status(201).json({
            success: true,
            requestId: req.id,
            message: 'Lead captured successfully!',
            data: savedLead
        });

        // ============================================
        // AUDIT LOG: New lead captured
        // ============================================
        console.log(`[${req.id}] ✅ New lead captured`);
        console.log(`    Email: ${savedLead.email}`);
        console.log(`    Subject: ${savedLead.subject}`);
        console.log(`    IP: ${req.ip}`);
    } catch (error) {
        console.error(`[${req.id}] Error saving lead:`, error.message);
        
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                requestId: req.id,
                message: 'Validation error. Please check your input.',
                errors: messages
            });
        }

        // Handle duplicate email
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                requestId: req.id,
                message: 'An inquiry from this email already exists.'
            });
        }

        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not save lead. Please try again later.'
        });
    }
});

// ============================================
// GET: Fetch all leads (PROTECTED - Admin only)
// ============================================
router.get('/', verifyToken, async (req, res) => {
    try {
        // Get pagination parameters with sensible defaults and limits
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Max 1000 per request
        const skip = Math.max(parseInt(req.query.skip) || 0, 0);

        const leads = await Lead.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean(); // Use lean() for faster read-only queries

        const total = await Lead.countDocuments();

        // ============================================
        // AUDIT LOG: Admin fetched leads
        // ============================================
        console.log(`[${req.id}] ✅ Admin fetched ${leads.length} leads`);
        console.log(`    IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            count: leads.length,
            total: total,
            data: leads
        });
    } catch (error) {
        console.error(`[${req.id}] Error fetching leads:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not fetch leads.'
        });
    }
});

// ============================================
// PUT: Update a lead's status (PROTECTED - Admin only)
// ============================================
router.put('/:id', verifyToken, validateLeadId, async (req, res) => {
    try {
        const { status } = req.body;
        
        // Validate status value
        const validStatuses = ['new', 'contacted', 'qualified', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                requestId: req.id,
                message: 'Invalid status value. Must be one of: ' + validStatuses.join(', ')
            });
        }
        
        // Find by ID and update the status
        const updatedLead = await Lead.findByIdAndUpdate(
            req.params.id, 
            { status },
            { new: true, runValidators: true } // Return updated doc, run schema validation
        );

        if (!updatedLead) {
            return res.status(404).json({
                success: false,
                requestId: req.id,
                message: 'Lead not found.'
            });
        }

        // ============================================
        // AUDIT LOG: Admin updated lead
        // ============================================
        console.log(`[${req.id}] ✅ Admin updated lead status`);
        console.log(`    Lead ID: ${req.params.id}`);
        console.log(`    New Status: ${status}`);
        console.log(`    IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            message: 'Lead updated successfully!',
            data: updatedLead
        });
    } catch (error) {
        console.error(`[${req.id}] Error updating lead:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not update lead.'
        });
    }
});

// ============================================
// DELETE: Remove a lead (PROTECTED - Admin only)
// ============================================
router.delete('/:id', verifyToken, validateLeadId, async (req, res) => {
    try {
        const deletedLead = await Lead.findByIdAndDelete(req.params.id);

        if (!deletedLead) {
            return res.status(404).json({
                success: false,
                requestId: req.id,
                message: 'Lead not found.'
            });
        }

        // ============================================
        // AUDIT LOG: Admin deleted lead
        // ============================================
        console.log(`[${req.id}] ✅ Admin deleted lead`);
        console.log(`    Lead ID: ${req.params.id}`);
        console.log(`    Email: ${deletedLead.email}`);
        console.log(`    IP: ${req.ip}`);

        res.status(200).json({
            success: true,
            requestId: req.id,
            message: 'Lead deleted successfully!'
        });
    } catch (error) {
        console.error(`[${req.id}] Error deleting lead:`, error.message);
        res.status(500).json({
            success: false,
            requestId: req.id,
            message: 'Server error. Could not delete lead.'
        });
    }
});

module.exports = router;