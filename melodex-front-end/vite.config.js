// vite.config.ts (or .js)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // You’re at the domain root (melodx.io), so keep base = '/'
  base: '/',

  build: {
    outDir: 'dist',          // default, but explicit
    assetsDir: 'assets',     // default, but explicit (matches your URLs)
    sourcemap: false,        // prod sourcemaps off
    // Avoid accidentally inlining huge assets and keep hashed filenames
    assetsInlineLimit: 4096,
    rollupOptions: {
      // Ensure single HTML entry and let Vite manage hashed asset names
      input: 'index.html'
    }
  },

  // esbuild.sourcemap here doesn’t affect dev; remove to avoid confusion
  // If you want dev CSS sourcemaps, use css.devSourcemap instead.
  css: {
    devSourcemap: false
  },

  server: {
    port: Number(process.env.VITE_PORT) || 3001,
    // Do not set strict rewrite proxies here for Amplify; it serves built assets.
    // strictPort: true, // optional
  },

  optimizeDeps: {
    // Prebundle these so dev starts snappy; no harm in leaving for prod build.
    include: ['aws-amplify', '@aws-amplify/auth', '@aws-amplify/core']
  },

  define: {
    // Some AWS libs expect `global`
    global: 'window'
  }
})
