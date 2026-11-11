import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { DataSourceAdapter, type ChangesetCallback } from "./DataSourceAdapter"

type Row = { id: number }
const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe("DataSourceAdapter ingestion lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["requestAnimationFrame", "cancelAnimationFrame"]
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("retires queued callbacks on disconnect and resumes history before pushes", async () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received, { chunkThreshold: 0, chunkSize: 1 })
    const disconnect = adapter.connect()
    adapter.setBoundedData(rows)
    adapter.push({ id: 4 })
    disconnect()
    await Promise.resolve()
    vi.advanceTimersToNextFrame()
    expect(received).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
    const disconnectAgain = adapter.connect()
    await Promise.resolve()
    expect(received.mock.calls.map(([change]) => change.inserts)).toEqual([
      [rows[0]], [rows[1]], [rows[2]], [{ id: 4 }]
    ])
    disconnectAgain()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("keeps clear a replacement barrier while disconnected", async () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received)
    const disconnect = adapter.connect()
    adapter.push(rows[0])
    disconnect()
    adapter.clear()
    adapter.connect()
    await Promise.resolve()
    expect(received).not.toHaveBeenCalled()
    adapter.push(rows[1])
    await Promise.resolve()
    expect(received).toHaveBeenCalledExactlyOnceWith({ inserts: [rows[1]], bounded: false })
  })

  it("stops a flush if its consumer disconnects during a history callback", () => {
    const received = vi.fn<ChangesetCallback<Row>>((change) => {
      if (change.boundedAppend) disconnect()
    })
    const adapter = new DataSourceAdapter(received, { chunkThreshold: 0, chunkSize: 1 })
    const disconnect = adapter.connect()
    adapter.setBoundedData(rows)
    adapter.push({ id: 4 })
    adapter.flush()
    expect(received.mock.calls.map(([change]) => change.inserts)).toEqual([[rows[0]], [rows[1]]])
    expect(vi.getTimerCount()).toBe(0)
  })

  it("clamps chunkSize=0 so progressive ingestion always advances", () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received, {
      chunkThreshold: 0,
      chunkSize: 0
    })
    adapter.setBoundedData(rows)
    expect(received).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ inserts: [rows[0]] })
    )
    vi.advanceTimersToNextFrame()
    vi.advanceTimersToNextFrame()
    expect(received.mock.calls.map(([change]) => change.inserts)).toEqual(
      rows.map((row) => [row])
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cancels an in-flight requestAnimationFrame even when its id is zero", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(0)
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame")
    const adapter = new DataSourceAdapter(vi.fn(), {
      chunkThreshold: 0,
      chunkSize: 1
    })
    adapter.setBoundedData(rows)
    adapter.clear()
    expect(cancel).toHaveBeenCalledWith(0)
  })

  it.each([
    { chunkThreshold: Infinity, chunkSize: 1 },
    { chunkThreshold: 0, chunkSize: Infinity }
  ])("uses one complete first chunk with %j", (options) => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received, options)
    adapter.setReplacementData(rows)
    expect(received).toHaveBeenCalledExactlyOnceWith({
      inserts: rows,
      bounded: true,
      preserveCategoryOrder: true,
      ...(options.chunkThreshold === 0 ? { totalSize: rows.length } : {})
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  it("restores chunk defaults when controlled options are removed", () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received, {
      chunkThreshold: 0,
      chunkSize: 1
    })
    adapter.updateChunkOptions({
      chunkThreshold: undefined,
      chunkSize: undefined
    })
    adapter.setBoundedData(rows)
    expect(received).toHaveBeenCalledExactlyOnceWith({
      inserts: rows,
      bounded: true
    })
    expect(vi.getTimerCount()).toBe(0)
  })

  describe("progressive chunk schedule", () => {
    const many = (count: number): Row[] =>
      Array.from({ length: count }, (_, id) => ({ id }))

    function deliver(adapter: DataSourceAdapter<Row>, data: Row[]): void {
      adapter.setBoundedData(data)
      // Far more frames than any schedule needs; extra frames deliver nothing.
      for (let frame = 0; frame < 64; frame++) vi.advanceTimersToNextFrame()
    }

    function received() {
      const sizes: number[] = []
      const ids: number[] = []
      const callback: ChangesetCallback<Row> = (changeset) => {
        sizes.push(changeset.inserts.length)
        for (const row of changeset.inserts) ids.push(row.id)
      }
      return { sizes, ids, callback }
    }

    it.each([
      [5_001, [5_000, 1]],
      [12_000, [5_000, 7_000]],
      [40_000, [5_000, 35_000]],
      [50_000, [5_000, 15_000, 30_000]],
      [200_000, [5_000, 15_000, 60_000, 120_000]]
    ])("delivers %i rows in geometrically growing chunks by default", (count, expected) => {
      const log = received()
      deliver(new DataSourceAdapter(log.callback), many(count))

      expect(log.sizes).toEqual(expected)
      // Every row arrives exactly once, in order.
      expect(log.ids).toHaveLength(count)
      expect(log.ids.every((id, index) => id === index)).toBe(true)
    })

    it("keeps total rebuild work linear in the dataset size", () => {
      for (const count of [5_001, 9_999, 40_001, 160_001, 640_001, 1_000_000]) {
        const log = received()
        deliver(new DataSourceAdapter(log.callback), many(count))

        // A consumer rebuilds everything delivered so far after each chunk.
        let delivered = 0
        let rebuiltRows = 0
        for (const size of log.sizes) {
          delivered += size
          rebuiltRows += delivered
        }
        expect(delivered).toBe(count)
        expect(rebuiltRows).toBeLessThanOrEqual(count * 2)
        // Fixed 5000-row chunks would need count / 5000 deliveries.
        expect(log.sizes.length).toBeLessThanOrEqual(6)
      }
    })

    it("keeps exact fixed-size chunks when chunkSize is explicit", () => {
      const log = received()
      deliver(
        new DataSourceAdapter(log.callback, { chunkSize: 5_000 }),
        many(22_000)
      )
      expect(log.sizes).toEqual([5_000, 5_000, 5_000, 5_000, 2_000])
    })

    it("returns to the default schedule when an explicit chunkSize is removed", () => {
      const log = received()
      const adapter = new DataSourceAdapter(log.callback, { chunkSize: 1_000 })
      adapter.updateChunkOptions({ chunkSize: undefined })
      deliver(adapter, many(50_000))
      expect(log.sizes).toEqual([5_000, 15_000, 30_000])
    })

    it("flush() completes the default schedule synchronously", () => {
      const log = received()
      const adapter = new DataSourceAdapter(log.callback)
      adapter.setBoundedData(many(200_000))
      adapter.flush()

      expect(log.sizes).toEqual([5_000, 15_000, 60_000, 120_000])
      expect(vi.getTimerCount()).toBe(0)
    })
  })

  it.each(["flush", "frame"] as const)(
    "finishes each %s callback before a reentrant flush publishes later rows",
    (source) => {
      const delivered = vi.fn<ChangesetCallback<Row>>()
      const adapter = new DataSourceAdapter<Row>(
        (change) => {
          if (change.boundedAppend) adapter.flush()
          delivered(change)
        },
        { chunkThreshold: 0, chunkSize: 1 }
      )
      adapter.setBoundedData(rows)
      adapter.push({ id: 4 })
      if (source === "flush") adapter.flush()
      else vi.advanceTimersToNextFrame()
      expect(delivered.mock.calls.map(([change]) => change.inserts)).toEqual([
        [rows[0]],
        [rows[1]],
        [rows[2]],
        [{ id: 4 }]
      ])
      expect(vi.getTimerCount()).toBe(0)
    }
  )

  it("finishes the initial snapshot callback before honoring a reentrant flush", () => {
    const delivered = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter<Row>(
      (change) => {
        adapter.flush()
        delivered(change)
      },
      { chunkThreshold: 0, chunkSize: 1 }
    )
    adapter.setBoundedData(rows)
    expect(delivered.mock.calls.map(([change]) => change.inserts)).toEqual(
      rows.map((row) => [row])
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it("does not let a retired microtask flush a later batch", async () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received)
    adapter.push(rows[0])
    adapter.flush()
    const between = vi.fn()
    queueMicrotask(between)
    adapter.push(rows[1])
    await Promise.resolve()
    expect(received).toHaveBeenCalledTimes(2)
    expect(between.mock.invocationCallOrder[0]).toBeLessThan(
      received.mock.invocationCallOrder[1]
    )
  })

  it("retires a queued push consumed while finishing history", async () => {
    const received = vi.fn<ChangesetCallback<Row>>((change) => {
      if (change.boundedAppend && change.inserts[0]?.id === 2)
        adapter.push({ id: 4 })
    })
    const adapter = new DataSourceAdapter(received, {
      chunkThreshold: 0,
      chunkSize: 1
    })
    adapter.setBoundedData(rows)
    adapter.flush()
    const between = vi.fn()
    queueMicrotask(between)
    adapter.push({ id: 5 })
    await Promise.resolve()
    expect(received.mock.calls.map(([change]) => change.inserts)).toEqual([
      [rows[0]],
      [rows[1]],
      [rows[2]],
      [{ id: 4 }],
      [{ id: 5 }]
    ])
    expect(between.mock.invocationCallOrder[0]).toBeLessThan(
      received.mock.invocationCallOrder[4]
    )
  })

  it("queues pushes made while publishing live rows until that callback finishes", async () => {
    const delivered = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter<Row>((change) => {
      if (change.inserts[0]?.id === 1) adapter.push(rows[1])
      delivered(change)
    })
    adapter.push(rows[0])
    adapter.flush()
    expect(delivered).toHaveBeenCalledExactlyOnceWith({
      inserts: [rows[0]],
      bounded: false
    })
    await Promise.resolve()
    expect(delivered).toHaveBeenLastCalledWith({
      inserts: [rows[1]],
      bounded: false
    })
  })

  it("retires the old flush when a callback replaces its history", async () => {
    const received = vi.fn<ChangesetCallback<Row>>((change) => {
      if (change.boundedAppend && change.inserts[0]?.id === 2) {
        adapter.setBoundedData([{ id: 10 }, { id: 11 }, { id: 12 }])
        adapter.push({ id: 13 })
      }
    })
    const adapter = new DataSourceAdapter(received, {
      chunkThreshold: 0,
      chunkSize: 1
    })
    adapter.setBoundedData(rows)
    adapter.push({ id: 4 })
    adapter.flush()
    expect(received.mock.calls.map(([change]) => change.inserts[0].id)).toEqual(
      [1, 2, 10]
    )
    await Promise.resolve()
    expect(received.mock.calls.map(([change]) => change.inserts[0].id)).toEqual(
      [1, 2, 10, 11, 12, 13]
    )
    expect(vi.getTimerCount()).toBe(0)
  })

  it("cancels queued chunks and pushes together", async () => {
    const received = vi.fn<ChangesetCallback<Row>>()
    const adapter = new DataSourceAdapter(received, {
      chunkThreshold: 0,
      chunkSize: 1
    })
    adapter.setBoundedData(rows)
    adapter.push({ id: 4 })
    adapter.clear()
    vi.runAllTimers()
    await Promise.resolve()
    expect(received).toHaveBeenCalledOnce()
    adapter.push({ id: 5 })
    await Promise.resolve()
    expect(received).toHaveBeenLastCalledWith({
      inserts: [{ id: 5 }],
      bounded: false
    })
  })
})
