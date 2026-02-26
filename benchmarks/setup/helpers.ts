/**
 * Helper utilities for performance benchmarks
 */

/**
 * Format time in ms with appropriate precision
 */
export function formatTime(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`
  } else if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  } else {
    return `${(ms / 1000).toFixed(2)}s`
  }
}

/**
 * Calculate operations per second
 */
export function calculateOpsPerSec(timeMs: number): number {
  return 1000 / timeMs
}

/**
 * Format operations per second
 */
export function formatOpsPerSec(opsPerSec: number): string {
  if (opsPerSec > 1000) {
    return `${(opsPerSec / 1000).toFixed(2)}k ops/sec`
  }
  return `${opsPerSec.toFixed(2)} ops/sec`
}

/**
 * Calculate percentage difference
 */
export function percentageDiff(current: number, baseline: number): number {
  return ((current - baseline) / baseline) * 100
}

/**
 * Format percentage difference with sign
 */
export function formatPercentageDiff(diff: number): string {
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)}%`
}

/**
 * Classify performance change
 */
export function classifyChange(percentDiff: number): {
  status: 'fail' | 'warn' | 'pass' | 'improvement'
  emoji: string
  color: string
} {
  if (percentDiff > 25) {
    return { status: 'fail', emoji: '🔴', color: 'red' }
  } else if (percentDiff > 15) {
    return { status: 'warn', emoji: '⚠️', color: 'yellow' }
  } else if (percentDiff < -15) {
    return { status: 'improvement', emoji: '✨', color: 'green' }
  } else {
    return { status: 'pass', emoji: '✅', color: 'green' }
  }
}

/**
 * Calculate statistics from array of numbers
 */
export function calculateStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const len = sorted.length

  const sum = sorted.reduce((acc, val) => acc + val, 0)
  const mean = sum / len
  const median = len % 2 === 0
    ? (sorted[len / 2 - 1] + sorted[len / 2]) / 2
    : sorted[Math.floor(len / 2)]

  const p95Index = Math.floor(len * 0.95)
  const p99Index = Math.floor(len * 0.99)
  const p95 = sorted[p95Index]
  const p99 = sorted[p99Index]

  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / len
  const stdDev = Math.sqrt(variance)

  return {
    mean,
    median,
    min: sorted[0],
    max: sorted[len - 1],
    p95,
    p99,
    stdDev,
    variance
  }
}

/**
 * Verify O(n²) scaling
 * Returns true if the timing roughly follows n² growth
 */
export function verifyQuadraticScaling(
  timings: Array<{ size: number; time: number }>,
  tolerance: number = 0.3
): boolean {
  if (timings.length < 2) return true

  // Calculate expected vs actual ratios
  const baseSize = timings[0].size
  const baseTime = timings[0].time

  for (let i = 1; i < timings.length; i++) {
    const size = timings[i].size
    const time = timings[i].time

    const sizeRatio = size / baseSize
    const expectedTimeRatio = sizeRatio * sizeRatio // O(n²)
    const actualTimeRatio = time / baseTime

    const error = Math.abs(actualTimeRatio - expectedTimeRatio) / expectedTimeRatio

    if (error > tolerance) {
      console.warn(
        `Quadratic scaling verification failed at size ${size}: ` +
        `expected ${expectedTimeRatio.toFixed(2)}x, got ${actualTimeRatio.toFixed(2)}x ` +
        `(${(error * 100).toFixed(1)}% error)`
      )
      return false
    }
  }

  return true
}

/**
 * Verify O(n) scaling
 */
export function verifyLinearScaling(
  timings: Array<{ size: number; time: number }>,
  tolerance: number = 0.3
): boolean {
  if (timings.length < 2) return true

  const baseSize = timings[0].size
  const baseTime = timings[0].time

  for (let i = 1; i < timings.length; i++) {
    const size = timings[i].size
    const time = timings[i].time

    const sizeRatio = size / baseSize
    const expectedTimeRatio = sizeRatio // O(n)
    const actualTimeRatio = time / baseTime

    const error = Math.abs(actualTimeRatio - expectedTimeRatio) / expectedTimeRatio

    if (error > tolerance) {
      console.warn(
        `Linear scaling verification failed at size ${size}: ` +
        `expected ${expectedTimeRatio.toFixed(2)}x, got ${actualTimeRatio.toFixed(2)}x ` +
        `(${(error * 100).toFixed(1)}% error)`
      )
      return false
    }
  }

  return true
}

/**
 * Simple console table for benchmark results
 */
export function printBenchmarkTable(
  title: string,
  results: Array<{ name: string; time: number; opsPerSec?: number }>
) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(title)
  console.log('='.repeat(60))
  console.log(
    'Name'.padEnd(30) +
    'Time'.padEnd(15) +
    'Ops/sec'.padEnd(15)
  )
  console.log('-'.repeat(60))

  for (const result of results) {
    const opsPerSec = result.opsPerSec || calculateOpsPerSec(result.time)
    console.log(
      result.name.padEnd(30) +
      formatTime(result.time).padEnd(15) +
      formatOpsPerSec(opsPerSec).padEnd(15)
    )
  }

  console.log('='.repeat(60) + '\n')
}

/**
 * Measure function execution time
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; time: number }> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, time: end - start }
}

/**
 * Run function multiple times and return statistics
 */
export async function measureMultiple<T>(
  fn: () => T | Promise<T>,
  iterations: number = 10
): Promise<{ results: T[]; stats: ReturnType<typeof calculateStats> }> {
  const times: number[] = []
  const results: T[] = []

  for (let i = 0; i < iterations; i++) {
    const { result, time } = await measureTime(fn)
    times.push(time)
    results.push(result)
  }

  return {
    results,
    stats: calculateStats(times)
  }
}
