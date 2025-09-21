import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs (good for both local dev and Replit)
    port: 5173, // Standard Vite port for local development
    open: false, // Don't auto-open browser in VS Code
    allowedHosts: true
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
