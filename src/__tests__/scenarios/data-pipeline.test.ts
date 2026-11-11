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

interface PipelineDatum {
  id: number
  value: number
}

/** Generate N items with sequential IDs */
function generateData(n: number): PipelineDatum[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, value: i * 10 }))
}

/** Drain the microtask queue so push batches flush */
function flushMicrotasks(): Promise<void> {
  return Promise.resolve()
}

// ── Tests ───────────────────────────────────────────────────────────────

describe("DataSourceAdapter Pipeline Scenarios", () => {
  beforeEach(() => {
    // Preserve native microtasks: push batching is Promise-based, while only
    // progressive bounded ingestion waits for animation frames.
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame"] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // 1. Small bounded data → single synchronous changeset
  it("small bounded dataset emits a single synchronous changeset", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    const data = generateData(100)
    adapter.setBoundedData(data)

    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].bounded).toBe(true)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(100)
    expect(onChangeset.mock.calls[0][0].inserts[0]).toEqual({ id: 0, value: 0 })
    expect(onChangeset.mock.calls[0][0].inserts[99]).toEqual({ id: 99, value: 990 })
  })

  it("same bounded data reference is a no-op", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    const data = generateData(100)
    adapter.setBoundedData(data)
    adapter.setBoundedData(data)

    expect(onChangeset).toHaveBeenCalledTimes(1)
  })

  it("same large bounded data reference does not restart chunking", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    const data = generateData(12000)
    adapter.setBoundedData(data)
    adapter.setBoundedData(data)

    expect(onChangeset).toHaveBeenCalledTimes(1)
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(2)
  })

  // 2. Large bounded data chunks progressively
  it("large bounded dataset (>5000) chunks: first synchronous, rest on rAF", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    const data = generateData(12000)
    adapter.setBoundedData(data)

    // First chunk is immediate (bounded: true)
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].bounded).toBe(true)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(5000)
    expect(onChangeset.mock.calls[0][0].totalSize).toBe(12000)

    // Flush rAF to get the second chunk. The default schedule grows
    // geometrically and never leaves a tail smaller than what is already
    // delivered, so the remaining 7000 rows arrive together.
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(2)
    expect(onChangeset.mock.calls[1][0].bounded).toBe(false) // appends, doesn't reset
    expect(onChangeset.mock.calls[1][0].boundedAppend).toBe(true)
    expect(onChangeset.mock.calls[1][0].inserts).toHaveLength(7000)

    // Nothing is left to deliver
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(2)

    // Total items across all changesets
    const totalItems = onChangeset.mock.calls.reduce((sum, [cs]) => sum + cs.inserts.length, 0)
    expect(totalItems).toBe(12000)
  })

  // 3. Push after bounded data appends (hybrid mode)
  it("push after setBoundedData appends without clearing", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.setBoundedData(generateData(10))
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].bounded).toBe(true)

    // Now push streaming data — buffered until microtask flushes
    adapter.push({ id: 100, value: 1000 })
    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(2)
    expect(onChangeset.mock.calls[1][0].bounded).toBe(false)
    expect(onChangeset.mock.calls[1][0].inserts).toEqual([{ id: 100, value: 1000 }])
  })

  // 4. pushMany emits single changeset after microtask flush
  it("pushMany emits a single changeset with all items", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.pushMany([
      { id: 1, value: 10 },
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ])

    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].bounded).toBe(false)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(3)
  })

  // 5. pushMany with empty array is no-op
  it("pushMany with empty array does not emit a changeset", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.pushMany([])
    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(0)
  })

  // 6. New setBoundedData cancels previous chunking
  it("setting new bounded data cancels in-flight chunking from previous data", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    // Start chunking a large dataset
    adapter.setBoundedData(generateData(10000))
    expect(onChangeset).toHaveBeenCalledTimes(1) // first chunk only

    // Before flushing rAF, set new data
    const newData = generateData(50)
    adapter.setBoundedData(newData)

    // Should emit fresh changeset for new data
    expect(onChangeset).toHaveBeenCalledTimes(2)
    expect(onChangeset.mock.calls[1][0].bounded).toBe(true)
    expect(onChangeset.mock.calls[1][0].inserts).toHaveLength(50)

    // Cancellation must release scheduled work, not just ignore its output.
    expect(vi.getTimerCount()).toBe(0)
    // Flush rAF — old chunking should NOT produce more changesets
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(2) // no additional changesets
  })

  // Clear allows the same reference to be ingested again.
  it("clear resets dedup so same reference can be re-ingested", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    const data = generateData(10)
    adapter.setBoundedData(data)
    expect(onChangeset).toHaveBeenCalledTimes(1)

    // Clear and re-set same reference
    adapter.clear()
    adapter.setBoundedData(data)
    expect(onChangeset).toHaveBeenCalledTimes(2) // re-ingested
  })

  // 8. Rapid setBoundedData calls — only last dataset completes chunking
  it("rapid setBoundedData calls: only the last dataset's chunks complete", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    // Fire off 3 large datasets rapidly
    adapter.setBoundedData(generateData(8000))
    adapter.setBoundedData(generateData(8000))
    adapter.setBoundedData(generateData(6000))

    // Each setBoundedData emits one immediate chunk
    expect(onChangeset).toHaveBeenCalledTimes(3)

    expect(vi.getTimerCount()).toBe(1)
    // Only the last dataset should continue chunking
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(4) // one more chunk from last dataset
    expect(onChangeset.mock.calls[3][0].inserts).toHaveLength(1000) // remaining 1000 of 6000

    // No more chunks
    vi.advanceTimersToNextFrame()
    expect(onChangeset).toHaveBeenCalledTimes(4)
  })

  // 9. Rapid push() calls are batched into a single changeset via microtask
  it("rapid push() calls within the same task are batched", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    // Simulate high-frequency pushes — all within the same synchronous task
    for (let i = 0; i < 1000; i++) {
      adapter.push({ id: i, value: i * 10 })
    }

    // Nothing flushed yet synchronously — all buffered
    expect(onChangeset).toHaveBeenCalledTimes(0)

    // Wait for microtask to flush
    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(1000)
    expect(onChangeset.mock.calls[0][0].bounded).toBe(false)
  })

  // 10. Mixed push() and pushMany() within same task are coalesced
  it("mixed push() and pushMany() within same task are coalesced", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.push({ id: 1, value: 10 })
    adapter.pushMany([
      { id: 2, value: 20 },
      { id: 3, value: 30 },
    ])
    adapter.push({ id: 4, value: 40 })

    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(4)
    expect(onChangeset.mock.calls[0][0].inserts.map((d) => d.id)).toEqual([1, 2, 3, 4])
  })

  // 11. clear() discards buffered pushes
  it("clear() discards buffered push data", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.push({ id: 1, value: 10 })
    adapter.push({ id: 2, value: 20 })
    adapter.clear()

    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(0)
  })

  // 12. Successive flushes across microtask boundaries produce separate changesets
  it("pushes across separate microtask ticks produce separate changesets", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.push({ id: 1, value: 10 })
    await flushMicrotasks() // first flush
    expect(onChangeset).toHaveBeenCalledTimes(1)

    adapter.push({ id: 2, value: 20 })
    await flushMicrotasks() // second flush
    expect(onChangeset).toHaveBeenCalledTimes(2)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(1)
    expect(onChangeset.mock.calls[1][0].inserts).toHaveLength(1)
  })

  // 13. flush() provides synchronous escape hatch
  it("flush() immediately processes buffered pushes synchronously", () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.push({ id: 1, value: 10 })
    adapter.push({ id: 2, value: 20 })

    // Nothing flushed yet
    expect(onChangeset).toHaveBeenCalledTimes(0)

    // Explicit flush
    adapter.flush()
    expect(onChangeset).toHaveBeenCalledTimes(1)
    expect(onChangeset.mock.calls[0][0].inserts).toHaveLength(2)
    expect(onChangeset.mock.calls[0][0].inserts.map((d) => d.id)).toEqual([1, 2])
  })

  it("clear discards buffered push data", async () => {
    const onChangeset = vi.fn<(changeset: Changeset<PipelineDatum>) => void>()
    const adapter = new DataSourceAdapter<PipelineDatum>(onChangeset)

    adapter.push({ id: 1, value: 10 })
    adapter.clear()

    await flushMicrotasks()
    expect(onChangeset).toHaveBeenCalledTimes(0)
  })
})
