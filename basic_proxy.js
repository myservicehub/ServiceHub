const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('🚀 Starting Basic Proxy Server...');

// API Proxy - route all /api requests to the backend
const apiProxy = createProxyMiddleware({
  target: 'http://localhost:8001',
  changeOrigin: true,
  logLevel: 'info'
});

app.use('/api', apiProxy);

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Proxy server is working!', timestamp: new Date().toISOString() });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend/build')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Basic Proxy Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 API requests (/api/*) will be proxied to http://localhost:8001`);
  console.log(`📱 Mobile access: http://10.219.64.152:${PORT}`);
});