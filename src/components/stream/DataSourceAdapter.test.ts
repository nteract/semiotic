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
