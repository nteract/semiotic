/**
 * Scenario tests: Data ingestion pipeline under real-world conditions.
 *
 * Tests DataSourceAdapter's progressive chunking, hybrid bounded+streaming
 * mode, cancellation semantics, deduplication, and microtask-based push
 * batching — the data flow contract that Stream Frames depend on.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { DataSourceAdapter } from "../../components/stream/DataSourceAdapter"
import type { Changeset } from "../../components/stream/types"

// ── Helpers ─────────────────────────────────────────────────────────────

/** Generate N items with sequential IDs */
function generateData(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: i, value: i * 10 }))
}

/** Drain the microtask queue so push batches flush */
function flushMicrotasks(): Promise<void> {
  return Promise.resolve()
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
  it("push after setBoundedData appends without clearing", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.setBoundedData(generateData(10))
    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(true)

    // Now push streaming data — buffered until microtask flushes
    adapter.push({ id: 100, value: 1000 })
    await flushMicrotasks()
    expect(changesets).toHaveLength(2)
    expect(changesets[1].bounded).toBe(false)
    expect(changesets[1].inserts).toEqual([{ id: 100, value: 1000 }])
  })

  // 4. pushMany emits single changeset after microtask flush
  it("pushMany emits a single changeset with all items", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.pushMany([
      { id: 1, value: 10 },
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ])

    await flushMicrotasks()
    expect(changesets).toHaveLength(1)
    expect(changesets[0].bounded).toBe(false)
    expect(changesets[0].inserts).toHaveLength(3)
  })

  // 5. pushMany with empty array is no-op
  it("pushMany with empty array does not emit a changeset", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.pushMany([])
    await flushMicrotasks()
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

  // 9. Rapid push() calls are batched into a single changeset via microtask
  it("rapid push() calls within the same task are batched", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    // Simulate high-frequency pushes — all within the same synchronous task
    for (let i = 0; i < 1000; i++) {
      adapter.push({ id: i, value: i * 10 })
    }

    // Nothing flushed yet synchronously — all buffered
    expect(changesets).toHaveLength(0)

    // Wait for microtask to flush
    await flushMicrotasks()
    expect(changesets).toHaveLength(1)
    expect(changesets[0].inserts).toHaveLength(1000)
    expect(changesets[0].bounded).toBe(false)
  })

  // 10. Mixed push() and pushMany() within same task are coalesced
  it("mixed push() and pushMany() within same task are coalesced", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.push({ id: 1, value: 10 })
    adapter.pushMany([
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ])
    adapter.push({ id: 4, value: 40 })

    await flushMicrotasks()
    expect(changesets).toHaveLength(1)
    expect(changesets[0].inserts).toHaveLength(4)
    expect(changesets[0].inserts.map((d: any) => d.id)).toEqual([1, 2, 3, 4])
  })

  // 11. clear() discards buffered pushes
  it("clear() discards buffered push data", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.push({ id: 1, value: 10 })
    adapter.push({ id: 2, value: 20 })
    adapter.clear()

    await flushMicrotasks()
    expect(changesets).toHaveLength(0)
  })

  // 12. Successive flushes across microtask boundaries produce separate changesets
  it("pushes across separate microtask ticks produce separate changesets", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.push({ id: 1, value: 10 })
    await flushMicrotasks() // first flush
    expect(changesets).toHaveLength(1)

    adapter.push({ id: 2, value: 20 })
    await flushMicrotasks() // second flush
    expect(changesets).toHaveLength(2)
    expect(changesets[0].inserts).toHaveLength(1)
    expect(changesets[1].inserts).toHaveLength(1)
  })

  // 13. flush() provides synchronous escape hatch
  it("flush() immediately processes buffered pushes synchronously", () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.push({ id: 1, value: 10 })
    adapter.push({ id: 2, value: 20 })

    // Nothing flushed yet
    expect(changesets).toHaveLength(0)

    // Explicit flush
    adapter.flush()
    expect(changesets).toHaveLength(1)
    expect(changesets[0].inserts).toHaveLength(2)
    expect(changesets[0].inserts.map((d: any) => d.id)).toEqual([1, 2])
  })

  // 14. clearLastData discards buffered pushes
  it("clearLastData discards buffered push data", async () => {
    const changesets: Changeset<any>[] = []
    const adapter = new DataSourceAdapter((cs) => changesets.push(cs))

    adapter.push({ id: 1, value: 10 })
    adapter.clearLastData()

    await flushMicrotasks()
    expect(changesets).toHaveLength(0)
  })
})
