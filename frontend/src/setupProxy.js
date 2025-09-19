const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  
  app.use(
    '/api',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      secure: true,
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request:', req.method, req.url, '->', backendUrl + req.url);
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(500).send('Proxy Error');
      }
    })
  );
};