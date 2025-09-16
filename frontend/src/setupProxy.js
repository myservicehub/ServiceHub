const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://10.219.63.217:8001',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onError: function (err, req, res) {
        console.log('Proxy Error:', err.message);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('Proxy Error: ' + err.message);
      },
      onProxyReq: function (proxyReq, req, res) {
        console.log('Proxying request:', req.method, req.url, '-> http://localhost:8001' + req.url);
      },
      onProxyRes: function (proxyRes, req, res) {
        console.log('Proxy response:', proxyRes.statusCode, 'for', req.url);
      }
    })
  );
};