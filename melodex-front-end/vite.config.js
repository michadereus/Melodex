import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // Disable in production builds
  },
  esbuild: {
    sourcemap: false, // Disable in dev mode
  },
  server: {
    port: process.env.VITE_PORT || 3001, // Use VITE_PORT or fallback to 3001
  },
  optimizeDeps: {
    include: [
      'aws-amplify',
      '@aws-amplify/auth',
      '@aws-amplify/core'
    ]
  },
  define: {
    global: 'window' // Maps `global` to `window` for browser compatibility
  },
});