// vitest.config.mjs
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// UI-only: virtual aws-amplify
function awsAmplifyVirtualPlugin() {
  const VIRTUAL_ID = '\0aws-amplify'
  return {
    name: 'virtual-aws-amplify',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'aws-amplify' || id.startsWith('aws-amplify/')) return VIRTUAL_ID
      return null
    },
    load(id) {
      if (id !== VIRTUAL_ID) return null
      return `
        export const Auth = {
          currentAuthenticatedUser: async () => ({ username: 'test-user' }),
          signOut: async () => {}
        };
        export default { Auth };
      `
    },
  }
}

// NEW: serve mongodb's deep file as a virtual no-op module (no repo file needed)
function mongoSearchIndexesVirtualPlugin() {
  // Target the exact deep import the driver performs
  const TARGET_ID = 'mongodb/lib/operations/search_indexes/update'
  const VIRTUAL_ID = '\0mongo-update-search-index'
  return {
    name: 'virtual-mongo-search-index-update',
    enforce: 'pre',
    resolveId(id) {
      if (id === TARGET_ID) return VIRTUAL_ID
      return null
    },
    load(id) {
      if (id !== VIRTUAL_ID) return null
      // CommonJS export since the driver requires() this file
      return `module.exports = function updateSearchIndex() {};`
    },
  }
}

export default defineConfig({
  // Vite-level bits
  plugins: [awsAmplifyVirtualPlugin(), mongoSearchIndexesVirtualPlugin()],
  resolve: {
    alias: {
      // React aliases for UI project
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router': path.resolve(__dirname, 'node_modules/react-router'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
      // ⛔️ NOTE: no file-based alias for mongodb here anymore—the plugin handles it
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    exclude: ['aws-amplify'],
  },

  test: {
    globals: true,

    // Root-level (used by projects that `extends: true`)
    server: {
      deps: {
        // Keep these inlined so mocks/virtuals apply early
        inline: [
          'mongodb',
          /^mongodb\//,
          'connect-mongo',
          'mongoose',
        ],
      },
    },

    projects: [
      // ---------- UI + unit (jsdom) ----------
      {
        extends: true,
        test: {
          name: 'unit-ui',
          environment: 'jsdom',
          setupFiles: [path.resolve(__dirname, 'tests/support/vitest.setup.ts')],
          include: [
            'tests/unit/**/*.{test,spec}.ts?(x)',
            'tests/ui/**/*.{test,spec}.ts?(x)',
          ],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
          ],
          deps: {
            interopDefault: true,
            inline: []
          },
        },
      },

      // ---------- Integration (node) ----------
      {
        extends: false, // don’t inherit test options; Vite plugins still apply
        test: {
          name: 'integration',
          environment: 'node',
          setupFiles: [path.resolve(__dirname, 'tests/support/integration.setup.ts')],
          include: ['tests/integration/**/*.{test,spec}.ts?(x)'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
          ],
          server: {
            deps: {
              inline: [
                'mongodb',
                /^mongodb\//,
                'connect-mongo',
                'mongoose',
              ],
            },
          },
          // If you hit bundling quirks in some setups:
          // ssr: { noExternal: ['mongodb'] },
        },
      },
    ],
  },
})
