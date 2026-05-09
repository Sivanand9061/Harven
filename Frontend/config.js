// ============================================
// Frontend Configuration
// ============================================

// Auto-detect environment:
// - file:// protocol or localhost  → local dev → use absolute localhost URL
// - Deployed on Netlify            → use Render backend URL
const _isLocalDev = window.location.protocol === 'file:' ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

// ⚠️ Replace this with your actual Render backend URL after deploying:
// e.g. 'https://harven-backend.onrender.com/api'
const PRODUCTION_API = 'https://harven-backend.onrender.com/api';

const API_CONFIG = {
    baseUrl: _isLocalDev ? 'http://localhost:5001/api' : PRODUCTION_API,

    endpoints: {
        leads:    '/leads',
        products: '/products',
        auth:     '/auth'
    },

    timeout: 10000,

    ui: {
        loadingDelay: 300,
        pageSize: 20
    }
};
