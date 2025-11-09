// vitest.config.mjs
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

// UI-only: virtual aws-amplify
function awsAmplifyVirtualPlugin() {
  const VIRTUAL_ID = "\0aws-amplify";
  return {
    name: "virtual-aws-amplify",
    enforce: "pre",
    resolveId(id) {
      if (id === "aws-amplify" || id.startsWith("aws-amplify/")) {
        return VIRTUAL_ID;
      }
      return null;
    },
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

// Serve MongoDB deep import as a virtual no-op for tests
function mongoSearchIndexesVirtualPlugin() {
  const TARGET_ID = "mongodb/lib/operations/search_indexes/update";
  const VIRTUAL_ID = "\0mongo-update-search-index";
  return {
    name: "virtual-mongo-search-index-update",
    enforce: "pre",
    resolveId(id) {
      if (id === TARGET_ID) return VIRTUAL_ID;
      return null;
    },
    load(id) {
      if (id !== VIRTUAL_ID) return null;
      return `module.exports = function updateSearchIndex() {};`;
    },
  };
}

export default defineConfig({
  plugins: [awsAmplifyVirtualPlugin(), mongoSearchIndexesVirtualPlugin()],

  resolve: {
    alias: {
      react: path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
      "react-router": path.resolve(__dirname, "node_modules/react-router"),
      "react-router-dom": path.resolve(
        __dirname,
        "node_modules/react-router-dom"
      ),
      "react/jsx-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-runtime.js"
      ),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "node_modules/react/jsx-dev-runtime.js"
      ),
    },
    dedupe: ["react", "react-dom", "react-router", "react-router-dom"],
  },

  optimizeDeps: {
    exclude: ["aws-amplify"],
  },

  test: {
    globals: true,

    // Single authoritative coverage config
    coverage: {
      provider: "v8",
      // enabled is automatically true when you pass --coverage; this keeps CLI simple.
      reportsDirectory: "coverage",
      reporter: isCI
        ? ["text", "text-summary", "lcov"]
        : ["text", "text-summary", "html", "lcov"],
      include: [
        "melodex-front-end/src/**/*.{js,jsx,ts,tsx}",
        "melodex-back-end/src/**/*.{js,jsx,ts,tsx}",
      ],
      exclude: [
        "tests/**/*",
        "**/*.d.ts",
        "node_modules/**",
        "coverage/**",
        "dist/**",
        "docs/**",
        "scripts/**",
      ],
      clean: true,
    },

    server: {
      deps: {
        inline: ["mongodb", /^mongodb\//, "connect-mongo", "mongoose"],
      },
    },

    projects: [
      // ---------- UI + unit (jsdom) ----------
      {
        extends: true,
        test: {
          name: "unit-ui",
          environment: "jsdom",
          setupFiles: [
            path.resolve(__dirname, "tests/support/vitest.setup.ts"),
          ],
          include: [
            "tests/unit/**/*.{test,spec}.ts?(x)",
            "tests/ui/**/*.{test,spec}.ts?(x)",
          ],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/cypress/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
          ],
          deps: {
            interopDefault: true,
            inline: [],
          },
        },
      },

      // ---------- Integration (node) ----------
      {
        extends: false,
        test: {
          name: "integration",
          environment: "node",
          setupFiles: [
            path.resolve(__dirname, "tests/support/integration.setup.ts"),
          ],
          include: ["tests/integration/**/*.{test,spec}.ts?(x)"],
          exclude: [
            "**/node_modules/**",
            "**/dist/**",
            "**/cypress/**",
            "**/.{idea,git,cache,output,temp}/**",
            "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
          ],
          server: {
            deps: {
              inline: ["mongodb", /^mongodb\//, "connect-mongo", "mongoose"],
            },
          },
          // Uses the same top-level coverage config
        },
      },
    ],
  },
});
