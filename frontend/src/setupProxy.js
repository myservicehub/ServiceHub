const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // In dev, align with backend default port 8001 unless overridden
  let backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  if (backendUrl.includes('localhost:8000')) {
    console.warn('⚠️ Detected localhost:8000 in proxy backend URL, overriding to localhost:8001');
    backendUrl = 'http://localhost:8001';
  }
  
  console.log('🔧 Proxy Configuration:', { backendUrl });
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: false, // Set to true for HTTPS in production
      timeout: 30000, // 30 second timeout
      logLevel: 'info',
      onProxyReq: (proxyReq, req, res) => {
        console.log(`🚀 Proxying: ${req.method} ${req.url} -> ${backendUrl}${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`✅ Proxy Response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy Error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            error: 'Service Unavailable',
            message: 'Backend service is not available',
            timestamp: new Date().toISOString()
          });
        }
      }
    })
  );
};