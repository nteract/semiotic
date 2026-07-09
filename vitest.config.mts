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
      'codemod/**',
      // check-file-size.test.mjs uses the Node built-in test runner
      // (`node --test`), not vitest — it imports `node:test` directly,
      // which vitest's bundler can't resolve. Exclude it so vitest's
      // default *.test.mjs glob doesn't sweep it in.
      'scripts/**/*.test.mjs'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'integration-tests/**',
        'codemod/**',
      ],
      thresholds: {
        // Global floors raised toward the measured aggregate (~78/68/81/80) so
        // the gate bites a real regression instead of leaving ~16 points of
        // slack on branches. A ~6-point buffer absorbs normal churn.
        statements: 72,
        branches: 62,
        functions: 76,
        lines: 74,
        // Per-file floors so the gate bites where risk concentrates, not just
        // on the blended average (a thin file eroding barely moves the global
        // number). Set just below current measured coverage — they ratchet
        // against regression. Raise the frame floors as frame-level behavioral
        // tests are added (the Stream Geo/Network frames are the least covered).
        'src/components/stream/StreamGeoFrame.tsx': { statements: 33, branches: 30, functions: 36, lines: 34 },
        'src/components/stream/StreamNetworkFrame.tsx': { statements: 33, branches: 30, functions: 34, lines: 37 },
        'src/components/stream/pipelineTransitions.ts': { statements: 52, branches: 38, functions: 30, lines: 55 },
        'src/components/charts/network/processSankey/algorithm.ts': { statements: 80, branches: 74, functions: 76, lines: 82 },
      }
    },
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      exclude: ['node_modules', 'dist']
    }
  }
})
