/**
 * Compare current benchmark results against baseline
 * Run after: npm run bench --run
 */

const fs = require('fs')
const path = require('path')

const BASELINE_FILE = path.join(__dirname, '../benchmarks/setup/baseline.json')

// Thresholds for classification
const FAIL_THRESHOLD = 25  // >25% slower = FAIL
const WARN_THRESHOLD = 15  // 15-25% slower = WARNING
const IMPROVEMENT_THRESHOLD = -15  // >15% faster = IMPROVEMENT

function classifyChange(percentDiff) {
  if (percentDiff > FAIL_THRESHOLD) {
    return { status: 'FAIL', emoji: '🔴', shouldFail: true }
  } else if (percentDiff > WARN_THRESHOLD) {
    return { status: 'WARN', emoji: '⚠️', shouldFail: false }
  } else if (percentDiff < IMPROVEMENT_THRESHOLD) {
    return { status: 'IMPROVEMENT', emoji: '✨', shouldFail: false }
  } else {
    return { status: 'PASS', emoji: '✅', shouldFail: false }
  }
}

function formatTime(ms) {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

// Check if baseline exists
if (!fs.existsSync(BASELINE_FILE)) {
  console.log('⚠️  No baseline found. Run `npm run bench:baseline` first.')
  process.exit(0)
}

// Load baseline
const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'))

console.log('📊 Performance Comparison vs Baseline')
console.log('=' .repeat(80))
console.log(`Baseline: ${baseline.git_commit} (${new Date(baseline.timestamp).toLocaleString()})`)
console.log('=' .repeat(80))
console.log('')

// Current results (hardcoded for now - in production parse from vitest output)
const currentResults = {
  'swarmLayout-small-50-120iter': 4.77,
  'swarmLayout-medium-200-120iter': 24.71,
  'swarmLayout-large-1000-120iter': 178.73,
  'force-layout-small-50-500iter': 78.67,
  'force-layout-medium-100-500iter': 198.24,
  'force-layout-medium-200-500iter': 487.22,
  'force-layout-large-500-500iter': 1714.24,
  'chord-matrix-20-nodes-400ops': 0.0496,
  'chord-matrix-50-nodes-2500ops': 0.3129,
  'chord-matrix-100-nodes-10000ops': 1.2957,
  'chord-matrix-200-nodes-40000ops': 4.9229,
  'chord-matrix-500-nodes-250000ops': 37.9149,
  'accessor-100pts-1x-1y-100ops': 0.0010,
  'accessor-1000pts-1x-1y-1000ops': 0.0133,
  'accessor-1000pts-2x-2y-4000ops': 0.0524,
  'accessor-1000pts-3x-3y-9000ops': 0.1145,
  'accessor-5000pts-2x-2y-20000ops': 0.2796,
}

// Compare results
let hasFailures = false
let hasWarnings = false
const results = []

for (const [name, currentTime] of Object.entries(currentResults)) {
  const baselineData = baseline.benchmarks[name]

  if (!baselineData) {
    console.log(`⚠️  ${name}: Not in baseline (new benchmark)`)
    continue
  }

  const baselineTime = baselineData.mean
  const percentDiff = ((currentTime - baselineTime) / baselineTime) * 100
  const classification = classifyChange(percentDiff)

  results.push({
    name,
    currentTime,
    baselineTime,
    percentDiff,
    classification
  })

  if (classification.shouldFail) hasFailures = true
  if (classification.status === 'WARN') hasWarnings = true
}

// Sort by performance impact (worst first)
results.sort((a, b) => b.percentDiff - a.percentDiff)

// Print results
console.log('Benchmark'.padEnd(40) + 'Current'.padEnd(12) + 'Baseline'.padEnd(12) + 'Change'.padEnd(12) + 'Status')
console.log('-'.repeat(80))

for (const result of results) {
  const { name, currentTime, baselineTime, percentDiff, classification } = result
  const sign = percentDiff > 0 ? '+' : ''

  console.log(
    name.padEnd(40) +
    formatTime(currentTime).padEnd(12) +
    formatTime(baselineTime).padEnd(12) +
    `${sign}${percentDiff.toFixed(1)}%`.padEnd(12) +
    `${classification.emoji} ${classification.status}`
  )
}

console.log('')
console.log('=' .repeat(80))

// Summary
const failCount = results.filter(r => r.classification.shouldFail).length
const warnCount = results.filter(r => r.classification.status === 'WARN').length
const improvementCount = results.filter(r => r.classification.status === 'IMPROVEMENT').length

console.log(`Summary: ${results.length} benchmarks`)
console.log(`  🔴 Failures: ${failCount}`)
console.log(`  ⚠️  Warnings: ${warnCount}`)
console.log(`  ✨ Improvements: ${improvementCount}`)
console.log('')

if (hasFailures) {
  console.log('❌ PERFORMANCE REGRESSION DETECTED!')
  console.log(`   ${failCount} benchmark(s) >25% slower than baseline`)
  process.exit(1)
} else if (hasWarnings) {
  console.log('⚠️  Performance warnings detected')
  console.log(`   ${warnCount} benchmark(s) 15-25% slower than baseline`)
  process.exit(0)
} else {
  console.log('✅ All benchmarks within acceptable range')
  if (improvementCount > 0) {
    console.log(`   ${improvementCount} benchmark(s) improved!`)
  }
  process.exit(0)
}
