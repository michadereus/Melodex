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
});