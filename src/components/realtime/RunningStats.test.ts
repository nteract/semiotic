import { RunningStats } from "./RunningStats"

// Naive two-pass reference. Deliberately the textbook definition, not
// the optimized form — it's the ground truth RunningStats is checked
// against.
function reference(values: number[]) {
  const finite = values.filter(v => Number.isFinite(v))
  const count = finite.length
  if (count === 0) {
    return {
      count: 0,
      mean: 0,
      sum: 0,
      variance: 0,
      sampleVariance: 0,
      min: Infinity,
      max: -Infinity,
    }
  }
  const sum = finite.reduce((a, b) => a + b, 0)
  const mean = sum / count
  const m2 = finite.reduce((a, b) => a + (b - mean) ** 2, 0)
  return {
    count,
    mean,
    sum,
    variance: count < 2 ? 0 : m2 / count,
    sampleVariance: count < 2 ? 0 : m2 / (count - 1),
    min: Math.min(...finite),
    max: Math.max(...finite),
  }
}

function expectMatches(stats: RunningStats, values: number[]) {
  const ref = reference(values)
  expect(stats.count).toBe(ref.count)
  expect(stats.mean).toBeCloseTo(ref.mean, 9)
  expect(stats.sum).toBeCloseTo(ref.sum, 6)
  expect(stats.variance).toBeCloseTo(ref.variance, 9)
  expect(stats.sampleVariance).toBeCloseTo(ref.sampleVariance, 9)
  expect(stats.stddev).toBeCloseTo(Math.sqrt(ref.variance), 9)
  expect(stats.sampleStddev).toBeCloseTo(Math.sqrt(ref.sampleVariance), 9)
  expect(stats.min).toBe(ref.min)
  expect(stats.max).toBe(ref.max)
}

describe("RunningStats", () => {
  it("starts empty", () => {
    const s = new RunningStats()
    expect(s.count).toBe(0)
    expect(s.mean).toBe(0)
    expect(s.sum).toBe(0)
    expect(s.variance).toBe(0)
    expect(s.stddev).toBe(0)
    expect(s.min).toBe(Infinity)
    expect(s.max).toBe(-Infinity)
  })

  it("handles a single value (variance 0)", () => {
    const s = new RunningStats()
    s.push(42)
    expect(s.count).toBe(1)
    expect(s.mean).toBe(42)
    expect(s.sum).toBe(42)
    expect(s.variance).toBe(0)
    expect(s.sampleVariance).toBe(0)
    expect(s.min).toBe(42)
    expect(s.max).toBe(42)
  })

  it("matches the two-pass reference on a simple sequence", () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const s = new RunningStats()
    values.forEach(v => s.push(v))
    expectMatches(s, values)
    // Known textbook example: stddev (population) = 2.
    expect(s.stddev).toBeCloseTo(2, 9)
  })

  it("matches the reference on random inputs", () => {
    for (let trial = 0; trial < 20; trial++) {
      const n = 1 + Math.floor(Math.random() * 500)
      const values = Array.from({ length: n }, () => (Math.random() - 0.5) * 1000)
      const s = new RunningStats()
      values.forEach(v => s.push(v))
      expectMatches(s, values)
    }
  })

  it("stays stable on large-offset clustered values (Welford's advantage)", () => {
    // Naive sum-of-squares loses precision here; Welford should not.
    const base = 1e9
    const values = [base + 4, base + 7, base + 13, base + 16]
    const s = new RunningStats()
    values.forEach(v => s.push(v))
    // Variance is independent of the offset: same as [4,7,13,16].
    const centered = [4, 7, 13, 16]
    const cs = new RunningStats()
    centered.forEach(v => cs.push(v))
    expect(s.variance).toBeCloseTo(cs.variance, 6)
  })

  it("ignores non-finite values", () => {
    const s = new RunningStats()
    ;[1, NaN, 2, Infinity, 3, -Infinity].forEach(v => s.push(v))
    expectMatches(s, [1, 2, 3])
  })

  it("clears back to empty", () => {
    const s = new RunningStats()
    ;[1, 2, 3].forEach(v => s.push(v))
    s.clear()
    expect(s.count).toBe(0)
    expect(s.min).toBe(Infinity)
    expect(s.max).toBe(-Infinity)
  })

  describe("merge", () => {
    it("equals pushing all values into one accumulator", () => {
      const all = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
      const whole = new RunningStats()
      all.forEach(v => whole.push(v))

      const a = new RunningStats()
      const b = new RunningStats()
      all.slice(0, 4).forEach(v => a.push(v))
      all.slice(4).forEach(v => b.push(v))
      a.merge(b)

      expect(a.count).toBe(whole.count)
      expect(a.mean).toBeCloseTo(whole.mean, 9)
      expect(a.variance).toBeCloseTo(whole.variance, 9)
      expect(a.min).toBe(whole.min)
      expect(a.max).toBe(whole.max)
    })

    it("is associative across three partitions", () => {
      const values = Array.from({ length: 300 }, () => Math.random() * 100)
      const split = (lo: number, hi: number) => {
        const s = new RunningStats()
        values.slice(lo, hi).forEach(v => s.push(v))
        return s
      }
      const whole = new RunningStats()
      values.forEach(v => whole.push(v))

      // ((a ∪ b) ∪ c)
      const left = split(0, 100)
      left.merge(split(100, 200))
      left.merge(split(200, 300))

      // (a ∪ (b ∪ c))
      const bc = split(100, 200)
      bc.merge(split(200, 300))
      const right = split(0, 100)
      right.merge(bc)

      for (const s of [left, right]) {
        expect(s.count).toBe(whole.count)
        expect(s.mean).toBeCloseTo(whole.mean, 8)
        expect(s.variance).toBeCloseTo(whole.variance, 8)
        expect(s.min).toBe(whole.min)
        expect(s.max).toBe(whole.max)
      }
    })

    it("merging an empty accumulator is a no-op", () => {
      const a = new RunningStats()
      ;[1, 2, 3].forEach(v => a.push(v))
      const before = { mean: a.mean, variance: a.variance, count: a.count }
      a.merge(new RunningStats())
      expect(a.count).toBe(before.count)
      expect(a.mean).toBe(before.mean)
      expect(a.variance).toBe(before.variance)
    })

    it("merging into an empty accumulator copies the other's state", () => {
      const a = new RunningStats()
      const b = new RunningStats()
      ;[5, 10, 15].forEach(v => b.push(v))
      a.merge(b)
      expect(a.count).toBe(3)
      expect(a.mean).toBeCloseTo(10, 9)
      expect(a.min).toBe(5)
      expect(a.max).toBe(15)
    })
  })

  it("clone produces an independent copy", () => {
    const a = new RunningStats()
    ;[1, 2, 3].forEach(v => a.push(v))
    const b = a.clone()
    b.push(100)
    expect(a.count).toBe(3)
    expect(b.count).toBe(4)
    expect(a.max).toBe(3)
    expect(b.max).toBe(100)
  })
})
