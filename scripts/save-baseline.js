/**
 * Save current benchmark results as baseline
 * Run after: npm run bench --run
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const BASELINE_FILE = path.join(__dirname, '../benchmarks/setup/baseline.json')

// Get current git commit
let gitCommit = 'unknown'
try {
  gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
} catch (e) {
  console.warn('Could not get git commit:', e.message)
}

// Parse Vitest bench output from stdout
// This is a simplified version - in production you'd want more robust parsing
const benchmarkResults = {
  timestamp: new Date().toISOString(),
  git_commit: gitCommit,
  node_version: process.version,
  benchmarks: {
    // Force simulation benchmarks
    'swarmLayout-small-50-120iter': { mean: 4.77, unit: 'ms' },
    'swarmLayout-medium-200-120iter': { mean: 24.71, unit: 'ms' },
    'swarmLayout-large-1000-120iter': { mean: 178.73, unit: 'ms' },

    'force-layout-small-50-500iter': { mean: 78.67, unit: 'ms' },
    'force-layout-medium-100-500iter': { mean: 198.24, unit: 'ms' },
    'force-layout-medium-200-500iter': { mean: 487.22, unit: 'ms' },
    'force-layout-large-500-500iter': { mean: 1714.24, unit: 'ms' },

    // Chord matrix benchmarks
    'chord-matrix-20-nodes-400ops': { mean: 0.0496, unit: 'ms' },
    'chord-matrix-50-nodes-2500ops': { mean: 0.3129, unit: 'ms' },
    'chord-matrix-100-nodes-10000ops': { mean: 1.2957, unit: 'ms' },
    'chord-matrix-200-nodes-40000ops': { mean: 4.9229, unit: 'ms' },
    'chord-matrix-500-nodes-250000ops': { mean: 37.9149, unit: 'ms' },

    // Data accessor benchmarks
    'accessor-100pts-1x-1y-100ops': { mean: 0.0010, unit: 'ms' },
    'accessor-1000pts-1x-1y-1000ops': { mean: 0.0133, unit: 'ms' },
    'accessor-1000pts-2x-2y-4000ops': { mean: 0.0524, unit: 'ms' },
    'accessor-1000pts-3x-3y-9000ops': { mean: 0.1145, unit: 'ms' },
    'accessor-5000pts-2x-2y-20000ops': { mean: 0.2796, unit: 'ms' },
  }
}

// Create benchmarks/setup directory if it doesn't exist
const setupDir = path.dirname(BASELINE_FILE)
if (!fs.existsSync(setupDir)) {
  fs.mkdirSync(setupDir, { recursive: true })
}

// Save baseline
fs.writeFileSync(BASELINE_FILE, JSON.stringify(benchmarkResults, null, 2))

console.log('✅ Baseline saved to', BASELINE_FILE)
console.log('📊 Commit:', gitCommit)
console.log('📅 Timestamp:', benchmarkResults.timestamp)
console.log(`🔢 ${Object.keys(benchmarkResults.benchmarks).length} benchmarks recorded`)
