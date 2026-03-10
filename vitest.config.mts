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
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      exclude: ['node_modules', 'dist']
    }
  }
})
