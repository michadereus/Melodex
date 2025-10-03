// vitest.config.ts (repo root)
import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
import path from 'node:path';


// Load backend test env BEFORE tests import your app
dotenvConfig({
  // adjust the path to where your backend test env actually lives
  path: path.resolve(process.cwd(), 'melodex-back-end/.env')
});

export default defineConfig({
  test: {
    // ---- Global defaults shared by ALL projects ----
    globals: true,
    css: true,
    setupFiles: ['./tests/support/vitest.setup.ts'],

    // coverage is global (not per-project)
    coverage: {
      reporter: ['text', 'html'],
      reportsDirectory: './coverage'
    },

    // ---- Multiple projects (names must match what you pass to --project) ----
    projects: [
      // UI + Unit (runs in jsdom)
      {
        test: {
          name: 'unit-ui',
          environment: 'jsdom',
          include: [
            'tests/unit/**/*.{test,spec}.ts?(x)',
            'tests/ui/**/*.{test,spec}.ts?(x)'
          ],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
          ]
        }
      },

      // Integration/API (runs in node)
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.{test,spec}.ts?(x)'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
          ]
        }
      }
    ]
  }
});
