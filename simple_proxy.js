const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('🚀 Starting ServiceHub Proxy Server...');

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API Proxy - route all /api requests to the backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8001',
  changeOrigin: true,
  logLevel: 'info',
  onError: (err, req, res) => {
    console.error(`❌ Proxy error for ${req.url}:`, err.message);
    res.status(500).json({ error: 'Backend connection failed', details: err.message });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`📡 Proxying: ${req.method} ${req.url} -> http://localhost:8001${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`✅ Response: ${proxyRes.statusCode} for ${req.url}`);
  }
}));

// Test endpoint to verify proxy is working
app.get('/proxy-test', (req, res) => {
  res.json({ 
    message: 'Proxy server is working!', 
    backend_target: 'http://localhost:8001',
    proxy_port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Serve React build files
app.use(express.static(path.join(__dirname, 'frontend/build')));

// Handle React Router - send index.html for all non-API routes
app.get('/*', (req, res) => {
  if (!req.url.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ServiceHub Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 API requests (/api/*) will be proxied to http://localhost:8001`);
  console.log(`🌐 Frontend served from React build`);
  console.log(`📱 Mobile access: http://10.219.64.152:${PORT}`);
});