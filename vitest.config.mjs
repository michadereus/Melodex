// vitest.config.mjs
import { defineConfig } from 'vitest/config'
import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenvConfig({ path: path.resolve(__dirname, 'melodex-back-end/.env') })

// put this above export default
function awsAmplifyVirtualPlugin() {
  const VIRTUAL_ID = '\0aws-amplify';       // <-- single canonical id

  return {
    name: 'virtual-aws-amplify',
    enforce: 'pre',

    // When Vite tries to resolve "aws-amplify" (or deep imports), hand it our id.
    resolveId(id) {
      if (id === 'aws-amplify' || id.startsWith('aws-amplify/')) {
        return VIRTUAL_ID;
      }
      return null;
    },

    // Serve a tiny module for that id.
    load(id) {
      if (id !== VIRTUAL_ID) return null;
      return `
        export const Auth = {
          currentAuthenticatedUser: async () => ({ username: 'test-user' }),
          signOut: async () => {}
        };
        export default { Auth };
      `;
    },
  };
}


export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'tests/support/vitest.setup.ts')], // <-- absolute path
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

  resolve: {
    alias: {
      // keep your react/router aliases only
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react-router': path.resolve(__dirname, 'node_modules/react-router'),
      'react-router-dom': path.resolve(__dirname, 'node_modules/react-router-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
      // ❌ do NOT alias 'aws-amplify' here
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },

  optimizeDeps: {
    exclude: ['aws-amplify'], // keep esbuild from prebundling it
  },

  plugins: [awsAmplifyVirtualPlugin()], // <-- add the plugin
});
