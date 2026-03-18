// ============================================
// Frontend Configuration
// ============================================

const API_CONFIG = {
    // Base URL - Since the app is now a monolithic Full-Stack app on Render,
    // using a relative path works flawlessly for both Localhost and Cloud!
    baseUrl: '/api', 
    
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
