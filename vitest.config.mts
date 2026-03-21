import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: [
      'node_modules',
      'dist',
      'integration-tests/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      thresholds: {
        statements: 62,
        branches: 52,
        functions: 63,
        lines: 65
      }
    },
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      exclude: ['node_modules', 'dist']
    }
  }
})
