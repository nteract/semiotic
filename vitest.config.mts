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
        statements: 40,
        branches: 35,
        functions: 35,
        lines: 40
      }
    },
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      exclude: ['node_modules', 'dist']
    }
  }
})
