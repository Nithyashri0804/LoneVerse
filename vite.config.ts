import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all local IPs (required for Replit)
    port: 5000, // Replit frontend port
    open: false, // Don't auto-open browser in VS Code
    strictPort: true, // Must bind to port 5000 for workflow detection
    allowedHosts: true,
    hmr: {
      host: '0.0.0.0',
      port: 5000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5000 // Keep production preview on 5000 for deployment
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
  },
  resolve: {
    alias: {
      '@': '/src', // Add path alias for easier imports
    }
  }
});
