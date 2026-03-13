/**
 * Scenario tests: Data ingestion pipeline under real-world conditions.
 *
 * Tests DataSourceAdapter's progressive chunking, hybrid bounded+streaming
 * mode, cancellation semantics, and deduplication — the data flow contract
 * that Stream Frames depend on.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DataSourceAdapter } from "../../components/stream/DataSourceAdapter"
import type { Changeset } from "../../components/stream/types"

// ── Helpers ─────────────────────────────────────────────────────────────

/** Generate N items with sequential IDs */
function generateData(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i, value: i * 10 }))
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("DataSourceAdapter Pipeline Scenarios", () => {
  let rafCallbacks: (() => void)[]
  let originalRAF: typeof requestAnimationFrame
  let originalCancelRAF: typeof cancelAnimationFrame

  beforeEach(() => {
    rafCallbacks = []
    originalRAF = globalThis.requestAnimationFrame
    originalCancelRAF = globalThis.cancelAnimationFrame

    // Mock requestAnimationFrame to capture and manually flush callbacks
    let nextId = 1
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      const id = nextId++
      rafCallbacks.push(() => cb(performance.now()))
      return id
    }) as any
    globalThis.cancelAnimationFrame = vi.fn()
  })

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF
    globalThis.cancelAnimationFrame = originalCancelRAF
  })

  /** Flush all pending rAF callbacks (one level) */
  function flushRAF() {
    const cbs = [...rafCallbacks]
    rafCallbacks = []
    cbs.forEach((cb) => cb())
  }

  // 1. Small bounded data → single synchronous changeset
  it("small bounded dataset emits a single synchronous changeset", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    const data = generateData(100)
    adapter.setBoundedData(data)

    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(true)
    expect(changesets[0].inserts).toHaveLength(100)
    expect(changesets[0].inserts[0]).toEqual({ id: 0, value: 0 })
    expect(changesets[0].inserts[99]).toEqual({ id: 99, value: 990 })
  })

  // 2. Large bounded data chunks progressively
  it("large bounded dataset (>5000) chunks: first synchronous, rest on rAF", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    const data = generateData(12000)
    adapter.setBoundedData(data)

    // First chunk is immediate (bounded: true)
    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(true)
    expect(changesets[0].inserts).toHaveLength(5000)
    expect(changesets[0].totalSize).toBe(12000)

    // Flush rAF to get second chunk
    flushRAF()
    expect(changesets).toHaveLength(2)
    expect(changesets[1].bounded).toBe(false) // appends, doesn't reset
    expect(changesets[1].inserts).toHaveLength(5000)

    // Flush again for final chunk
    flushRAF()
    expect(changesets).toHaveLength(3)
    expect(changesets[2].inserts).toHaveLength(2000) // remaining items

    // Total items across all changesets
    const totalItems = changesets.reduce((sum, cs) => sum + cs.inserts.length, 0)
    expect(totalItems).toBe(12000)
  })

  // 3. Push after bounded data appends (hybrid mode)
  it("push after setBoundedData appends without clearing", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.setBoundedData(generateData(10))
    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(true)

    // Now push streaming data
    adapter.push({ id: 100, value: 1000 })
    expect(changesets).toHaveLength(2)
    expect(changesets[1].bounded).toBe(false)
    expect(changesets[1].inserts).toEqual([{ id: 100, value: 1000 }])
  })

  // 4. pushMany emits single changeset
  it("pushMany emits a single changeset with all items", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.pushMany([
      { id: 1, value: 10 },
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ])

    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(false)
    expect(changesets[0].inserts).toHaveLength(3)
  })

  // 5. pushMany with empty array is no-op
  it("pushMany with empty array does not emit a changeset", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.pushMany([])
    expect(changesets).toHaveLength(0)
  })

  // 6. New setBoundedData cancels previous chunking
  it("setting new bounded data cancels in-flight chunking from previous data", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    // Start chunking a large dataset
    adapter.setBoundedData(generateData(10000))
    expect(changesets).toHaveLength(1) // first chunk only

    // Before flushing rAF, set new data
    const newData = generateData(50)
    adapter.setBoundedData(newData)

    // Should emit fresh changeset for new data
    expect(changesets).toHaveLength(2)
    expect(changesets[1].bounded).toBe(true)
    expect(changesets[1].inserts).toHaveLength(50)

    // Flush rAF — old chunking should NOT produce more changesets
    flushRAF()
    expect(changesets).toHaveLength(2) // no additional changesets
  })

  // 7. clearLastData allows same reference to re-ingest
  it("clearLastData resets dedup so same reference can be re-ingested", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    const data = generateData(10)
    adapter.setBoundedData(data)
    expect(changesets).toHaveLength(1)

    // Clear and re-set same reference
    adapter.clearLastData()
    adapter.setBoundedData(data)
    expect(changesets).toHaveLength(2) // re-ingested
  })

  // 8. Rapid setBoundedData calls — only last dataset completes chunking
  it("rapid setBoundedData calls: only the last dataset's chunks complete", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    // Fire off 3 large datasets rapidly
    adapter.setBoundedData(generateData(8000))
    adapter.setBoundedData(generateData(8000))
    adapter.setBoundedData(generateData(6000))

    // Each setBoundedData emits one immediate chunk
    expect(changesets).toHaveLength(3)

    // Only the last dataset should continue chunking
    flushRAF()
    expect(changesets).toHaveLength(4) // one more chunk from last dataset
    expect(changesets[3].inserts).toHaveLength(1000) // remaining 1000 of 6000

    // No more chunks
    flushRAF()
    expect(changesets).toHaveLength(4)
  })
})
