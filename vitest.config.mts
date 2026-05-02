import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    exclude: [
      'node_modules',
      'dist',
      'integration-tests/**',
      // The `codemod/` directory is a self-contained sibling package
      // with its own jest test runner. Exclude its test files (and the
      // nested node_modules vitest auto-walks into) so Semiotic's vitest
      // doesn't try to run jscodeshift internals.
      'codemod/**'
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
