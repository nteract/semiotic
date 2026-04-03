/**
 * TDD: scalePadding insets the scale range to prevent glyph clipping at edges.
 *
 * When scalePadding=10, the X scale range becomes [10, width-10] instead of [0, width].
 * The domain stays the same — only the pixel mapping changes.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"

describe("scalePadding", () => {
  const makeStore = (scalePadding?: number) => {
    const store = new PipelineStore({
      chartType: "scatter",
      xAccessor: "x",
      yAccessor: "y",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0,
      scalePadding,
    })
    store.ingest({
      inserts: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      bounded: true,
    })
    ;(store as any).computeScene({ width: 400, height: 300 })
    return store
  }

  it("without scalePadding, x range starts at 0 and ends at layout width", () => {
    const store = makeStore()
    expect(store.scales).not.toBeNull()
    const range = store.scales!.x.range()
    expect(range[0]).toBe(0)
    expect(range[1]).toBe(400)
  })

  it("with scalePadding=20, x range is inset by 20px on each side", () => {
    const store = makeStore(20)
    expect(store.scales).not.toBeNull()
    const range = store.scales!.x.range()
    expect(range[0]).toBe(20)
    expect(range[1]).toBe(380)
  })

  it("with scalePadding=20, y range is also inset", () => {
    const store = makeStore(20)
    const range = store.scales!.y.range()
    // Y range is inverted: [height, 0] → [height-pad, pad]
    expect(range[0]).toBe(280) // 300 - 20
    expect(range[1]).toBe(20)
  })

  it("domain stays the same regardless of scalePadding", () => {
    const withPad = makeStore(20)
    const withoutPad = makeStore()
    const domainWith = withPad.scales!.x.domain()
    const domainWithout = withoutPad.scales!.x.domain()
    expect(domainWith[0]).toBe(domainWithout[0])
    expect(domainWith[1]).toBe(domainWithout[1])
  })

  it("edge data points map to inset pixels, not chart edges", () => {
    const store = makeStore(20)
    // x=0 (min) should map to 20px (not 0)
    // x=100 (max) should map to 380px (not 400)
    expect(store.scales!.x(0)).toBe(20)
    expect(store.scales!.x(100)).toBe(380)
  })
})
