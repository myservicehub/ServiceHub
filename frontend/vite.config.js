import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  optimizeDeps: {
    include: ['react-hook-form', '@hookform/resolvers'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  define: {
    'process.env': {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL || '',
      PUBLIC_URL: ''
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});