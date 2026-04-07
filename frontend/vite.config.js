import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id || !id.includes('node_modules')) return;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-framework';
          }
          if (id.includes('@radix-ui') || id.includes('cmdk') || id.includes('vaul')) return 'vendor-ui';
          if (id.includes('@googlemaps')) return 'vendor-maps';
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';
          if (id.includes('zod') || id.includes('ajv') || id.includes('libphonenumber-js')) return 'vendor-validation';
          if (id.includes('axios') || id.includes('date-fns') || id.includes('gsap') || id.includes('embla-carousel-react')) {
            return 'vendor-utils';
          }
        }
      }
    }
  },
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
