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
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, (char) => map[char]);
}

function sanitizeLead(leadData) {
    return {
        firstName: escapeHtml(leadData.firstName || ''),
        lastName:  escapeHtml(leadData.lastName  || ''),
        email:     leadData.email   || '',
        company:   escapeHtml(leadData.company   || ''),
        phone:     escapeHtml(leadData.phone     || ''),
        subject:   escapeHtml(leadData.subject   || ''),
        message:   escapeHtml(leadData.message   || ''),
    };
}

// ============================================
// SECURITY: JWT Authentication Middleware
// ============================================
function verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-token'];
    if (!token) {
        return res.status(401).json({ success: false, requestId: req.id, message: 'Access denied. No token provided.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: 'harven-admin'
        });
        req.admin = decoded.admin;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, requestId: req.id, message: 'Invalid or expired token.' });
    }
}

// ============================================
// POST: Create a new lead (Public endpoint)
// ============================================
router.post('/', validateLead, async (req, res) => {
    try {
        const sanitizedData = sanitizeLead(req.body);
        const savedLead = await Lead.create(sanitizedData);

        const escapeForEmail = (text) =>
            String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Admin notification email
        const mailOptions = {
            from: `"HARVEN System" <${process.env.EMAIL_USER}>`,
            to:   process.env.EMAIL_USER,
            subject: `New Lead Alert: ${escapeForEmail(savedLead.subject)} - ${escapeForEmail(savedLead.company || savedLead.firstName)}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #1b5e3d; margin-top: 0;">New Inquiry Received! 🎉</h2>
                    <p style="color: #555; font-size: 14px;">A new lead has just submitted a request via the HARVEN website.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Name:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeForEmail(savedLead.firstName)} ${escapeForEmail(savedLead.lastName)}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${escapeForEmail(savedLead.email)}">${escapeForEmail(savedLead.email)}</a></td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Company:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeForEmail(savedLead.company || 'N/A')}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeForEmail(savedLead.phone || 'N/A')}</td></tr>
                        <tr><td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Subject:</td><td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeForEmail(savedLead.subject)}</td></tr>
                        <tr><td colspan="2" style="padding: 15px; background: #f9f9f9; border-radius: 6px;">${escapeForEmail(savedLead.message)}</td></tr>
                    </table>
                </div>`
        };

        // Customer auto-reply email
        const customerMailOptions = {
            from:    `"HARVEN Support" <${process.env.EMAIL_USER}>`,
            to:      savedLead.email,
            subject: `Thank you for contacting HARVEN`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; margin: 0 auto;">
                    <h1 style="color: #1a1a1a; letter-spacing: 2px; text-align: center;">HARVEN</h1>
                    <p>Dear ${escapeForEmail(savedLead.firstName)},</p>
                    <p>Thank you for reaching out. We have received your inquiry regarding <strong>${escapeForEmail(savedLead.subject)}</strong>.</p>
                    <p>Our team will respond within <strong>24 business hours</strong>.</p>
                    <p>Best regards,<br><strong style="color: #1b5e3d;">The HARVEN Team</strong></p>
                </div>`
        };

        transporter.sendMail(mailOptions).catch(err => console.error('Email error (admin):', err.message));
        transporter.sendMail(customerMailOptions).catch(err => console.error('Email error (customer):', err.message));

        console.log(`[${req.id}] ✅ New lead captured — ${savedLead.email}`);

        res.status(201).json({
            success: true,
            requestId: req.id,
            message: 'Lead captured successfully!',
            data: savedLead
        });
    } catch (error) {
        console.error(`[${req.id}] Error saving lead:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not save lead.' });
    }
});

// ============================================
// GET: Fetch all leads (PROTECTED - Admin only)
// ============================================
router.get('/', verifyToken, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const skip  = Math.max(parseInt(req.query.skip)  || 0,   0);

        const [leads, total] = await Promise.all([
            Lead.findAll({ limit, skip }),
            Lead.count()
        ]);

        console.log(`[${req.id}] ✅ Admin fetched ${leads.length} leads`);
        res.status(200).json({ success: true, requestId: req.id, count: leads.length, total, data: leads });
    } catch (error) {
        console.error(`[${req.id}] Error fetching leads:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not fetch leads.' });
    }
});

// ============================================
// PUT: Update a lead's status (PROTECTED)
// ============================================
router.put('/:id', verifyToken, validateLeadId, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['new', 'contacted', 'qualified', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false, requestId: req.id,
                message: 'Invalid status. Must be: ' + validStatuses.join(', ')
            });
        }
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, { status });
        if (!updatedLead) return res.status(404).json({ success: false, requestId: req.id, message: 'Lead not found.' });

        console.log(`[${req.id}] ✅ Lead ${req.params.id} status → ${status}`);
        res.status(200).json({ success: true, requestId: req.id, message: 'Lead updated.', data: updatedLead });
    } catch (error) {
        console.error(`[${req.id}] Error updating lead:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not update lead.' });
    }
});

// ============================================
// DELETE: Remove a lead (PROTECTED)
// ============================================
router.delete('/:id', verifyToken, validateLeadId, async (req, res) => {
    try {
        const deletedLead = await Lead.findByIdAndDelete(req.params.id);
        if (!deletedLead) return res.status(404).json({ success: false, requestId: req.id, message: 'Lead not found.' });

        console.log(`[${req.id}] ✅ Lead ${req.params.id} deleted`);
        res.status(200).json({ success: true, requestId: req.id, message: 'Lead deleted.' });
    } catch (error) {
        console.error(`[${req.id}] Error deleting lead:`, error.message);
        res.status(500).json({ success: false, requestId: req.id, message: 'Server error. Could not delete lead.' });
    }
});

module.exports = router;