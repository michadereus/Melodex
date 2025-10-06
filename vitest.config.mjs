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

export default defineConfig({
  // Put Vite-level bits here; UI project will opt-in via `extends: true`
  plugins: [awsAmplifyVirtualPlugin()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router': path.resolve(__dirname, 'node_modules/react-router'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  optimizeDeps: {
    exclude: ['aws-amplify'],
  },

  test: {
    globals: true,

    // 👈 IMPORTANT: projects belong under test.projects
    projects: [
      // ---------- UI + unit (jsdom) ----------
      {
        // Inherit root plugins/resolve/etc. Only this project gets them.
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
          // (Deprecated warning is fine; can move to server.deps.inline later)
          deps: {
            interopDefault: true,
            inline: [
              /^react($|\/)/,
              /^react-dom($|\/)/,
              /^react-router($|\/)/,
              /^react-router-dom($|\/)/,
              /melodex-front-end/,
            ],
          },
        },
      },

      // ---------- Integration (node) ----------
      {
        // Do NOT inherit root plugins/resolve/etc.
        extends: false,
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
        },
      },
    ],
  },
})
