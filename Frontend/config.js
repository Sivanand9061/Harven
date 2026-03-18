// ============================================
// Frontend Configuration
// ============================================

const API_CONFIG = {
    // Base URL - Change this when deploying to production
    // Development: http://localhost:5001
    // Production: https://your-api-domain.com
    baseUrl: 'http://localhost:5001/api',
    
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

// For production deployment, use:
// const API_CONFIG = {
//     baseUrl: process.env.REACT_APP_API_URL || 'https://api.harvenllc.com/api',
//     ...
// };
