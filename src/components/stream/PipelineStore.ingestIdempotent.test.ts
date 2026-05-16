/**
 * Regression: `PipelineStore.ingest` with `bounded: true` must be a
 * no-op on the same `inserts` reference. Stream Frames call
 * `store.ingest({ inserts: data, bounded: true })` from *inside*
 * render in the SSR branch, which means React StrictMode (and any
 * concurrent / aborted render) runs it twice per mount.
 *
 * Without this guard, the second call would clear the buffer, re-fill
 * it from `inserts`, re-walk the extent — observable as wasted work
 * in dev mode and as a real correctness risk if a future change makes
 * the second pass non-trivially different from the first.
 *
 * The fast path: when `_lastBoundedInsertsRef === changeset.inserts`,
 * `ingest` returns `false` immediately. `clear()` resets the ref so
 * subsequent ingests on a fresh store re-run normally.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    xAccessor: "x",
    yAccessor: "y",
    ...overrides,
  }
}

describe("PipelineStore.ingest — bounded idempotency", () => {
  it("returns false on the second call with the same inserts ref (no-op fast path)", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
    }))
    const data = [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }]

    const first = store.ingest({ inserts: data, bounded: true })
    const second = store.ingest({ inserts: data, bounded: true })

    expect(first).toBe(true)
    expect(second).toBe(false)
  })

  it("does NOT short-circuit when the inserts array reference differs (even with same contents)", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
    }))
    const a = [{ x: 0, y: 1 }, { x: 1, y: 2 }]
    const b = [{ x: 0, y: 1 }, { x: 1, y: 2 }] // structurally equal but new ref

    expect(store.ingest({ inserts: a, bounded: true })).toBe(true)
    // New reference → ingest re-runs (returns true). The store can't
    // know the contents are identical without a deep compare, and
    // skipping a real data update would be a worse failure mode than
    // doing redundant work on a contrived shallow-equal-but-new array.
    expect(store.ingest({ inserts: b, bounded: true })).toBe(true)
  })

  it("clear() resets the dedupe ref so the next ingest re-runs", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
    }))
    const data = [{ x: 0, y: 1 }, { x: 1, y: 2 }]

    store.ingest({ inserts: data, bounded: true })
    store.clear()
    // After clear, the buffer is empty. If the dedupe ref still
    // matched, the next ingest would short-circuit and the store
    // would stay empty — broken. The clear() must reset the ref.
    expect(store.ingest({ inserts: data, bounded: true })).toBe(true)
    expect(store.getData().length).toBe(2)
  })

  it("streaming (non-bounded) ingests are NOT deduped — each call meaningful", () => {
    const store = new PipelineStore(makeConfig({
      chartType: "line",
      xAccessor: "x",
      yAccessor: "y",
      runtimeMode: "streaming",
    }))
    const point = { x: 0, y: 1 }

    // Streaming consumers push individual datums, often the same
    // object literal recycled. Deduping on reference would silently
    // drop all but the first. The fast path is bounded-only.
    const first = store.ingest({ inserts: [point], bounded: false })
    const second = store.ingest({ inserts: [point], bounded: false })
    expect(first).toBe(true)
    expect(second).toBe(true)
  })
})
