import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://servicehub-app-toziz.ondigitalocean.app',
        changeOrigin: true,
        secure: true,
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
      REACT_APP_GOOGLE_MAPS_API_KEY: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
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