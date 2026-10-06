import { defineConfig } from 'vitest/config'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { semioticSourceAliases } from './vite.shared.mjs'

const repoRoot = dirname(fileURLToPath(import.meta.url))
const isCoverageShard = process.env.SEMIOTIC_COVERAGE_SHARD === 'true'
const confinementTests = ['src/components/stream/physics/PhysicsConfinement.test.ts']

export default defineConfig(({ mode }) => ({
  resolve: {
    // Exercise the package's public import paths against current source rather
    // than an optional, ignored, and potentially stale local dist build.
    alias: semioticSourceAliases(repoRoot)
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // V8 coverage makes the 1,000-body simulations CPU intensive. Give them
    // an exclusive worker group so other files cannot consume their timeout.
    // Both projects still contribute to the same coverage map and shards.
    // Benchmarks retain their existing single-project configuration.
    projects: mode === 'benchmark' ? undefined : [
      {
        extends: true,
        test: {
          name: 'unit',
          exclude: confinementTests,
          sequence: { groupOrder: 0 }
        }
      },
      {
        extends: true,
        test: {
          name: 'physics-confinement',
          include: confinementTests,
          fileParallelism: false,
          sequence: { groupOrder: 1 }
        }
      }
    ],
    exclude: [
      'node_modules',
      'dist',
      'integration-tests/**',
      // The `codemod/` directory is a self-contained sibling package
      // with its own jest test runner. Exclude its test files (and the
      // nested node_modules vitest auto-walks into) so Semiotic's vitest
      // doesn't try to run jscodeshift internals.
      'codemod/**',
      // Node-runner suites import node:test, which the jsdom project cannot
      // bundle. Keep other script TypeScript tests in Vitest; discovery is
      // checked by scripts/vitest-projects.test.mjs before expensive jobs.
      'scripts/**/*.test.mjs',
      'scripts/release-preflight.test.ts'
    ],
    coverage: {
      provider: 'v8',
      // Coverage must use a fixed production denominator. Without `include`,
      // Vitest reports only modules imported by a particular test run, which
      // lets an untested production module disappear from the percentage.
      include: ['src/components/**/*.{ts,tsx,js,jsx}'],
      // Coverage shards hand their maps to a dedicated merge job. Reporting
      // and thresholds belong to that complete merged denominator, not to an
      // individual half of the suite.
      reporter: isCoverageShard ? [] : ['text-summary', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'integration-tests/**',
        'codemod/**',
        // Vitest matches coverage include globs against a filename substring;
        // without this exclusion, `docs/src/components/**` also matches the
        // production root pattern above.
        'docs/**',
      ],
      thresholds: isCoverageShard ? undefined : {
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
}))
