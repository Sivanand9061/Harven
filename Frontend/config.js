// ============================================
// Frontend Configuration
// ============================================

// Auto-detect environment:
// - file:// protocol or localhost = local dev → use absolute backend URL
// - Deployed on Render (same origin) → use relative /api path
const _isLocalDev = window.location.protocol === 'file:' ||
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

const API_CONFIG = {
    // Absolute URL for local dev; relative path for production (same-origin on Render)
    baseUrl: _isLocalDev ? 'http://localhost:5001/api' : '/api',

    endpoints: {
        leads: '/leads',
        products: '/products',
        auth: '/auth'
    },

    // Timeout for API requests (in milliseconds)
    timeout: 10000,

    // Display settings
    ui: {
        loadingDelay: 300,  // Delay before showing loading spinner (prevents flashing)
        pageSize: 20        // Items per page for pagination (future feature)
    }
};
